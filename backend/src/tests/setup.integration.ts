import { pool } from '../db/pool';

// Require a dedicated test database — never run against production
const testDbUrl = process.env['TEST_DATABASE_URL'];
if (!testDbUrl) {
  throw new Error(
    'TEST_DATABASE_URL must be set to run integration tests.\n' +
    'Example: TEST_DATABASE_URL=postgresql://finance_user:password@localhost:5432/finance_test'
  );
}

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = testDbUrl;
process.env['REDIS_URL'] = process.env['TEST_REDIS_URL'] ?? 'redis://localhost:6379';
process.env['JWT_ACCESS_SECRET'] = 'a'.repeat(64);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(64);
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '30d';
process.env['FRONTEND_URL'] = 'http://localhost:5173';
process.env['PORT'] = '4001';
process.env['BCRYPT_ROUNDS'] = '4'; // Fast bcrypt for tests

// Close pool after all integration tests finish
afterAll(async () => {
  await pool.end();
});
