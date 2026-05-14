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
    // Integration tests run via vitest.integration.config.ts (separate config).
    // Using inline projects caused "No test files found" in CI because vitest
    // resolves project include patterns relative to the workspace root, not the
    // config file directory, so src/tests/integration/** never matched.
  },
});
