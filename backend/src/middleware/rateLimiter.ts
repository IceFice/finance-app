import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { sendError } from '../lib/response';

interface RateLimitOptions {
  windowSec: number;
  max: number;
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
      // fail-open: Redis down → allow request but log the failure
      logRedisFailure(err);
    }
    next();
  };
}

export const authLimiter = rateLimiter({
  windowSec: 15 * 60,
  max: 5,
  // Key on email so each account gets its own 5-attempt budget.
  // This prevents cross-test contamination in E2E (all requests share 127.0.0.1)
  // while still protecting against brute-force on a specific account.
  keyFn: (req) => {
    const email = (req.body as { email?: string } | undefined)?.email ?? '';
    return `rl:auth:${req.ip}:${email}`;
  },
});

export const generalLimiter = rateLimiter({
  windowSec: 60,
  max: 200,
  keyFn: (req) => `rl:general:${(req as Request & { userId?: string }).userId ?? req.ip}`,
});

export const reportsLimiter = rateLimiter({
  windowSec: 3600,
  max: 30,
  keyFn: (req) => `rl:reports:${(req as Request & { userId?: string }).userId ?? req.ip}`,
});
