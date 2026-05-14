import { defineConfig } from 'vitest/config';

/**
 * Separate config for integration tests (Supertest + real Postgres + Redis).
 * Run via: npm run test:integration
 * Requires: TEST_DATABASE_URL, DATABASE_URL, REDIS_URL, JWT_* env vars.
 */
export default defineConfig({
  test: {
    name: 'integration',
    include: ['src/tests/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/tests/setup.integration.ts'],
    // Serial execution — tests share a real DB, parallelism causes contention
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
  },
});
