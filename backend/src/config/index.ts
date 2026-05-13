import { z } from 'zod';

const WEAK_SECRET_PATTERNS = [
  'change-me', 'changeme', 'secret', 'password', 'example',
  'placeholder', 'your-secret', 'replace', 'dummy',
];

const strongSecret = (minLen = 32) =>
  z.string().min(minLen, `Must be at least ${minLen} characters`).superRefine((val, ctx) => {
    const lower = val.toLowerCase();
    const isWeak = WEAK_SECRET_PATTERNS.some(p => lower.includes(p));
    if (isWeak && process.env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secret looks like a placeholder — use a cryptographically generated value in production',
      });
    }
  });

const envSchema = z.object({
  // ── Runtime ───────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // ── Database ──────────────────────────────────────────────
  DATABASE_URL: z.string().min(1).refine(
    (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
    { message: 'DATABASE_URL must be a valid PostgreSQL connection string' }
  ),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).max(20).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(2).max(100).default(10),
  DATABASE_SSL: z.coerce.boolean().default(false),

  // ── JWT ───────────────────────────────────────────────────
  JWT_ACCESS_SECRET: strongSecret(32),
  JWT_REFRESH_SECRET: strongSecret(32),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Must be like 15m, 1h, 7d').default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Must be like 15m, 1h, 7d').default('30d'),

  // ── Redis ─────────────────────────────────────────────────
  REDIS_URL: z.string().min(1).refine(
    (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
    { message: 'REDIS_URL must start with redis:// or rediss://' }
  ).default('redis://localhost:6379'),

  // ── CORS ─────────────────────────────────────────────────
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:5173'),

  // ── Security ─────────────────────────────────────────────
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().default(5),
  RATE_LIMIT_API_MAX: z.coerce.number().int().default(200),

  // ── Email (optional — for password reset) ─────────────────
  // Empty string ("") is treated as "not set" for all optional fields
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.preprocess(v => (v === '' ? undefined : v), z.string().email().optional()),

  // ── External APIs (optional) ──────────────────────────────
  EXCHANGE_RATE_API_KEY: z.string().optional(),
});

// Validate NODE_ENV separately first so error messages can reference it
const nodeEnv = process.env.NODE_ENV ?? 'development';

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌  Invalid environment configuration:\n');
  const fieldErrors = parsed.error.flatten().fieldErrors;
  Object.entries(fieldErrors).forEach(([field, errors]) => {
    errors?.forEach(msg => console.error(`  ${field}: ${msg}`));
  });
  console.error('\nFix the above variables in your .env file, then restart.\n');
  process.exit(1);
}

// Warn about weak secrets in non-production environments
if (nodeEnv !== 'production') {
  const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = parsed.data;
  const warnIfWeak = (name: string, value: string) => {
    const lower = value.toLowerCase();
    if (WEAK_SECRET_PATTERNS.some(p => lower.includes(p))) {
      console.warn(`⚠️  ${name} looks like a placeholder. Run \`npm run generate-secrets\` to create real values.`);
    }
  };
  warnIfWeak('JWT_ACCESS_SECRET', JWT_ACCESS_SECRET);
  warnIfWeak('JWT_REFRESH_SECRET', JWT_REFRESH_SECRET);
}

export const config = parsed.data;
export type Config = typeof config;
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
