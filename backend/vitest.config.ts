import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests: no real DB needed, fast
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['src/tests/integration/**'],
    environment: 'node',
    setupFiles: ['src/tests/setup.unit.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // all: false → only files actually imported during the test run are
      // measured. Since vitest ≥ 1.3 changed the default to true, we must be
      // explicit. Without this, every service/middleware/router file appears at
      // 0% and tanks the overall percentage below the thresholds.
      // Integration tests cover the service layer in a separate CI stage.
      all: false,
      exclude: [
        'src/**/__tests__/**',
        'src/tests/**',
        'src/server.ts',
        'src/db/pool.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // Integration project: requires TEST_DATABASE_URL
    projects: [
      {
        test: {
          name: 'integration',
          include: ['src/tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['src/tests/setup.integration.ts'],
          // Run integration tests serially to avoid DB contention
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
        },
      },
    ],
  },
});
