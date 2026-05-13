// Unit test environment — stub process.env so config validation passes
// without real secrets. Tests that need specific values override in the test.
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/finance_test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['JWT_ACCESS_SECRET'] = 'a'.repeat(64);
process.env['JWT_REFRESH_SECRET'] = 'b'.repeat(64);
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '30d';
process.env['FRONTEND_URL'] = 'http://localhost:5173';
process.env['PORT'] = '4000';
process.env['BCRYPT_ROUNDS'] = '10';
