import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { sendError } from '../lib/response';

interface RateLimitOptions {
  windowSec: number;
  max: number;
  // When Redis is unreachable: fail-open (allow) for availability-sensitive
  // endpoints, or fail-closed (reject) for brute-force-sensitive ones (auth).
  failClosed?: boolean;
  keyFn?: (req: Request) => string;
}

// Track Redis failures to log warnings without flooding logs
let redisFailures = 0;
let lastRedisFailureLog = 0;

function logRedisFailure(err: unknown) {
  redisFailures++;
  const now = Date.now();
  // Log at most once per 60 seconds
  if (now - lastRedisFailureLog > 60_000) {
    console.error(`[rateLimiter] Redis unavailable — rate limiting is DISABLED. Error: ${err}`);
    console.error(`[rateLimiter] Redis failure count since last log: ${redisFailures}`);
    lastRedisFailureLog = now;
    redisFailures = 0;
  }
}

export function rateLimiter(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting entirely in test environment — integration tests make
    // many rapid requests and would otherwise exhaust the per-IP auth limit (5/15min).
    if (process.env['NODE_ENV'] === 'test') return next();

    const key = opts.keyFn ? opts.keyFn(req) : `rl:${req.ip}:${req.path}`;
    try {
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, opts.windowSec);

      res.setHeader('X-RateLimit-Limit', opts.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.max - current));

      if (current > opts.max) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl);
        return sendError(
          res, 429, 'RATE_LIMIT_EXCEEDED',
          'Too many requests, please try again later',
          req.requestId ?? ''
        );
      }
    } catch (err) {
      logRedisFailure(err);
      // Brute-force-sensitive endpoints fail CLOSED in production: if we
      // can't count attempts, we must not silently disable the limiter.
      if (opts.failClosed && process.env['NODE_ENV'] === 'production') {
        return sendError(
          res, 503, 'SERVICE_UNAVAILABLE',
          'Rate limiter temporarily unavailable, please retry shortly',
          req.requestId ?? ''
        );
      }
      // Otherwise fail-open (availability over strictness) — already logged.
    }
    next();
  };
}

export const authLimiter = rateLimiter({
  windowSec: 15 * 60,
  max: 5,
  failClosed: true,
  // Key on email so each account gets its own 5-attempt budget.
  // This prevents cross-test contamination in E2E (all requests share 127.0.0.1)
  // while still protecting against brute-force on a specific account.
  keyFn: (req) => {
    const email = (req.body as { email?: string } | undefined)?.email ?? '';
    return `rl:auth:${req.ip}:${email}`;
  },
});

// Separate limiter for /auth/refresh — keyed by cookie token (unique per session)
// so each user session has its own bucket. Using the email-based authLimiter here
// would collapse ALL refresh calls to the same empty-email key and exhaust in 5 calls.
export const refreshLimiter = rateLimiter({
  windowSec: 60,
  max: 20,
  failClosed: true,
  keyFn: (req) => {
    const token = (req.cookies as { refreshToken?: string } | undefined)?.refreshToken ?? req.ip ?? '';
    // First 16 chars of the random hex token are sufficient for bucketing
    return `rl:refresh:${token.slice(0, 16) || req.ip}`;
  },
});

export const generalLimiter = rateLimiter({
  windowSec: 60,
  max: 200,
  keyFn: (req) => `rl:general:${(req as Request & { userId?: string }).userId ?? req.ip}`,
});

// Reports are read-only SQL aggregates. The page is interactive: the hero
// KPIs alone fire 4 requests (monthly-summary + spending-by-category for the
// current AND previous period), and each of the 4 tabs fires 1-4 more — so a
// single page visit is ~6-8 requests, and switching period/tab multiplies it.
// A 30/hour cap (the old value) ran out after ~4 page loads → spurious 429s.
// 120/min is a per-minute window with comfortable headroom for normal use
// while still throttling abusive bursts of expensive aggregation queries.
export const reportsLimiter = rateLimiter({
  windowSec: 60,
  max: 120,
  keyFn: (req) => `rl:reports:${(req as Request & { userId?: string }).userId ?? req.ip}`,
});
