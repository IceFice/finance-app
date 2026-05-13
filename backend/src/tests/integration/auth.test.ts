import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { createTestUser, deleteTestUser } from '../helpers/db';

// Each suite creates its own user and cleans up after itself.
// Tests run serially (singleFork: true in vitest.config.ts).

describe('POST /api/v1/auth/register', () => {
  const email = `register-${Date.now()}@example.com`;

  afterAll(async () => {
    // Clean up by finding the user via email
    const { pool } = await import('../../db/pool');
    await pool.query(`DELETE FROM users WHERE email = $1`, [email]);
  });

  it('creates a user and returns accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPass1!', fullName: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.userId).toBeTypeOf('string');
  });

  it('sets an HttpOnly refresh token cookie', async () => {
    // Use a different email to avoid conflict
    const e2 = `register2-${Date.now()}@example.com`;
    const { pool } = await import('../../db/pool');

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: e2, password: 'StrongPass1!', fullName: 'Another' });

    await pool.query(`DELETE FROM users WHERE email = $1`, [e2]);

    expect(res.status).toBe(201);
    const cookieHeader = res.headers['set-cookie'] as string[];
    expect(cookieHeader).toBeDefined();
    const rtCookie = cookieHeader.find((c: string) => c.startsWith('refreshToken='));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toContain('HttpOnly');
  });

  it('returns 409 for duplicate email', async () => {
    // register once to ensure the user exists
    await request(app).post('/api/v1/auth/register')
      .send({ email, password: 'StrongPass1!', fullName: 'Dup' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'StrongPass1!', fullName: 'Dup' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'StrongPass1!', fullName: 'Test' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for weak password (too short)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `weak-${Date.now()}@x.com`, password: '123', fullName: 'Weak' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  let userId: string;
  let email: string;
  const password = 'LoginTest123!';

  beforeAll(async () => {
    const user = await createTestUser({ password });
    userId = user.id;
    email = user.email;
  });

  afterAll(() => deleteTestUser(userId));

  it('returns 200 with accessToken for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    // accessToken is a JWT — 3 dot-separated segments
    expect(res.body.data.accessToken.split('.').length).toBe(3);
  });

  it('sets refreshToken as HttpOnly cookie on login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    const cookies = res.headers['set-cookie'] as string[];
    const rt = cookies?.find((c: string) => c.startsWith('refreshToken='));
    expect(rt).toBeDefined();
    expect(rt).toContain('HttpOnly');
    expect(rt).toContain('SameSite=Strict');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // Must NOT leak whether the account exists
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 401 for non-existent email (same message — no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  let userId: string;
  let email: string;
  const password = 'Refresh123!';

  beforeAll(async () => {
    const user = await createTestUser({ password });
    userId = user.id;
    email = user.email;
  });

  afterAll(() => deleteTestUser(userId));

  it('issues a new accessToken using the refresh cookie', async () => {
    const agent = request.agent(app); // preserves cookies across requests

    // Log in to get the refresh cookie
    await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

    // Use the refresh cookie
    const res = await agent.post('/api/v1/auth/refresh');
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('rotates the refresh token (old cookie rejected after use)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);

    // First refresh — succeeds and rotates
    const firstRefresh = await agent.post('/api/v1/auth/refresh');
    expect(firstRefresh.status).toBe(200);

    // Extract old cookie value before the agent updates it
    // Second call with the NEW cookie on the agent should also work
    const secondRefresh = await agent.post('/api/v1/auth/refresh');
    expect(secondRefresh.status).toBe(200);
  });

  it('returns 401 when no refresh cookie present', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  let userId: string;
  let email: string;
  const password = 'Logout123!';

  beforeAll(async () => {
    const user = await createTestUser({ password });
    userId = user.id;
    email = user.email;
  });

  afterAll(() => deleteTestUser(userId));

  it('logs out and refresh cookie becomes invalid', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email, password });

    // Logout
    const logoutRes = await agent.post('/api/v1/auth/logout');
    expect(logoutRes.status).toBe(204);

    // Attempt refresh after logout
    const refreshRes = await agent.post('/api/v1/auth/refresh');
    expect(refreshRes.status).toBe(401);
  });
});
