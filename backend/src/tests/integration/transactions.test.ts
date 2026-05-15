import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import {
  createTestUser, deleteTestUser,
  createTestAccount, createTestTransaction, loginTestUser,
} from '../helpers/db';

describe('GET /api/v1/transactions', () => {
  let userId: string;
  let accountId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    accountId = await createTestAccount(userId);

    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;

    // Seed 5 transactions across different dates
    await createTestTransaction(userId, accountId, { amount: '100.00', type: 'debit',  date: '2024-03-01' });
    await createTestTransaction(userId, accountId, { amount: '200.00', type: 'credit', date: '2024-03-05' });
    await createTestTransaction(userId, accountId, { amount: '150.00', type: 'debit',  date: '2024-03-10' });
    await createTestTransaction(userId, accountId, { amount: '300.00', type: 'credit', date: '2024-03-15' });
    await createTestTransaction(userId, accountId, { amount:  '50.00', type: 'debit',  date: '2024-03-20' });
  });

  afterAll(() => deleteTestUser(userId));

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
  });

  it('returns paginated list with data and pagination fields', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toHaveProperty('hasMore');
    expect(res.body.pagination).toHaveProperty('nextCursor');
  });

  it('filters by type=debit', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?type=debit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { type: string }) => t.type === 'debit')).toBe(true);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?from=2024-03-05&to=2024-03-15')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const dates = res.body.data.map((t: { date: string }) => t.date);
    dates.forEach((d: string) => {
      expect(d >= '2024-03-05' && d <= '2024-03-15').toBe(true);
    });
  });

  it('supports cursor-based pagination', async () => {
    // Request first page with limit=2
    const page1 = await request(app)
      .get('/api/v1/transactions?limit=2')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(2);
    expect(page1.body.pagination.hasMore).toBe(true);
    expect(page1.body.pagination.nextCursor).toBeTypeOf('string');

    // Request second page using cursor
    const cursor = page1.body.pagination.nextCursor;
    const page2 = await request(app)
      .get(`/api/v1/transactions?limit=2&cursor=${cursor}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBeGreaterThan(0);
    // Pages should not overlap
    const ids1 = new Set(page1.body.data.map((t: { id: string }) => t.id));
    page2.body.data.forEach((t: { id: string }) => {
      expect(ids1.has(t.id)).toBe(false);
    });
  });

  it('returns 422 for invalid cursor', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?cursor=not-a-valid-cursor!!!')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('money amounts are returned as strings, not numbers', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    res.body.data.forEach((t: { amount: unknown; amountBase: unknown }) => {
      expect(typeof t.amount).toBe('string');
      expect(typeof t.amountBase).toBe('string');
    });
  });

  it('does not return deleted transactions', async () => {
    // Create a transaction and immediately soft-delete it
    const txId = await createTestTransaction(userId, accountId, {
      amount: '999.00', description: 'SHOULD_BE_DELETED',
    });
    const { pool } = await import('../../db/pool');
    await pool.query(`UPDATE transactions SET deleted_at = NOW() WHERE id = $1`, [txId]);

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    const found = res.body.data.some((t: { id: string }) => t.id === txId);
    expect(found).toBe(false);
  });

  it('cannot see another user\'s transactions', async () => {
    const otherUser = await createTestUser();
    const otherAccount = await createTestAccount(otherUser.id);
    const otherTxId = await createTestTransaction(otherUser.id, otherAccount);

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    const found = res.body.data.some((t: { id: string }) => t.id === otherTxId);
    expect(found).toBe(false);

    await deleteTestUser(otherUser.id);
  });
});

describe('POST /api/v1/transactions', () => {
  let userId: string;
  let accountId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    accountId = await createTestAccount(userId);
    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;
  });

  afterAll(() => deleteTestUser(userId));

  it('creates a transaction and returns it', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        amount: '250.00',
        currency: 'USD',
        exchangeRate: '1',
        type: 'debit',
        description: 'Coffee shop',
        date: '2024-03-20',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe('250.00');
    expect(res.body.data.type).toBe('debit');
    expect(typeof res.body.data.amount).toBe('string');
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: '100.00' }); // missing accountId, currency, type, date

    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid amount format', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId, amount: 1.99, // number instead of string
        currency: 'USD', exchangeRate: '1', type: 'debit', date: '2024-03-20',
      });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/transactions/transfer', () => {
  let userId: string;
  let fromAccountId: string;
  let toAccountId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    fromAccountId = await createTestAccount(userId, { name: 'Checking' });
    toAccountId   = await createTestAccount(userId, { name: 'Savings' });
    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;
  });

  afterAll(() => deleteTestUser(userId));

  it('creates two linked transactions atomically', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fromAccountId,
        toAccountId,
        amount: '500.00',
        currency: 'USD',
        date: '2024-03-21',
      });

    expect(res.status).toBe(201);
    const { debitId, creditId } = res.body.data;
    expect(debitId).toBeTypeOf('string');
    expect(creditId).toBeTypeOf('string');
    expect(debitId).not.toBe(creditId);

    // Verify both transactions exist in the DB and are linked
    const { pool } = await import('../../db/pool');
    const debitRow  = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [debitId]);
    const creditRow = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [creditId]);

    expect(debitRow.rows[0].transfer_pair_id).toBe(creditId);
    expect(creditRow.rows[0].transfer_pair_id).toBe(debitId);
    expect(debitRow.rows[0].type).toBe('transfer');
    expect(creditRow.rows[0].type).toBe('transfer');
  });

  it('returns 400 when fromAccountId === toAccountId', async () => {
    const res = await request(app)
      .post('/api/v1/transactions/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fromAccountId,
        toAccountId: fromAccountId, // same account
        amount: '100.00',
        currency: 'USD',
        date: '2024-03-21',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DOMAIN_ERROR');
  });
});

describe('DELETE /api/v1/transactions/:id (soft delete)', () => {
  let userId: string;
  let accountId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    accountId = await createTestAccount(userId);
    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;
  });

  afterAll(() => deleteTestUser(userId));

  it('soft-deletes a transaction (deleted_at set, not removed from DB)', async () => {
    const txId = await createTestTransaction(userId, accountId);

    const deleteRes = await request(app)
      .delete(`/api/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(200);

    // Verify deleted_at is set in DB
    const { pool } = await import('../../db/pool');
    const row = await pool.query(`SELECT deleted_at FROM transactions WHERE id = $1`, [txId]);
    expect(row.rows[0].deleted_at).toBeTruthy();
  });

  it('returns 404 when deleting another user\'s transaction', async () => {
    const otherUser = await createTestUser();
    const otherAccount = await createTestAccount(otherUser.id);
    const otherTxId = await createTestTransaction(otherUser.id, otherAccount);

    const res = await request(app)
      .delete(`/api/v1/transactions/${otherTxId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    await deleteTestUser(otherUser.id);
  });
});
