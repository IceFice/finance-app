import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import {
  createTestUser, deleteTestUser,
  createTestAccount, createTestCategory,
  createTestTransaction, loginTestUser,
} from '../helpers/db';

describe('GET /api/v1/budgets/progress', () => {
  let userId: string;
  let accountId: string;
  let categoryId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    accountId = await createTestAccount(userId);
    categoryId = await createTestCategory({ userId, name: 'Groceries', type: 'expense' });

    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;

    // Create a budget for groceries
    await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Groceries Budget',
        categoryId,
        amount: '500.00',
        currency: 'USD',
        period: 'monthly',
        startDate: new Date().toISOString().slice(0, 10),
      });

    // Create some spending transactions in this category
    const today = new Date().toISOString().slice(0, 10);
    await createTestTransaction(userId, accountId, {
      amount: '120.00', type: 'debit', categoryId, date: today,
    });
    await createTestTransaction(userId, accountId, {
      amount: '80.00', type: 'debit', categoryId, date: today,
    });
  });

  afterAll(() => deleteTestUser(userId));

  it('returns budget list with spent amounts', async () => {
    const res = await request(app)
      .get('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    const grocery = res.body.data.find((b: { name: string }) => b.name === 'Groceries Budget');
    expect(grocery).toBeDefined();
    expect(grocery.spent).toBeTypeOf('string');
    expect(grocery.amount).toBeTypeOf('string');
  });

  it('calculates spent correctly from transactions in current period', async () => {
    const res = await request(app)
      .get('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`);

    const grocery = res.body.data.find((b: { name: string }) => b.name === 'Groceries Budget');
    // 120 + 80 = 200 spent
    expect(parseFloat(grocery.spent)).toBe(200);
  });

  it('returns money values as strings', async () => {
    const res = await request(app)
      .get('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`);

    res.body.data.forEach((b: { amount: unknown; spent: unknown }) => {
      expect(typeof b.amount).toBe('string');
      expect(typeof b.spent).toBe('string');
    });
  });

  it('only shows the current user\'s budgets', async () => {
    const other = await createTestUser();
    const otherAgent = request.agent(app);
    const otherTokens = await loginTestUser(otherAgent, other.email, other.password);

    // Other user creates a budget
    await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${otherTokens.accessToken}`)
      .send({
        name: 'OTHER USER BUDGET',
        amount: '999.00', currency: 'USD',
        period: 'monthly',
        startDate: new Date().toISOString().slice(0, 10),
      });

    const res = await request(app)
      .get('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`);

    const found = res.body.data.some((b: { name: string }) => b.name === 'OTHER USER BUDGET');
    expect(found).toBe(false);

    await deleteTestUser(other.id);
  });
});

describe('POST /api/v1/budgets', () => {
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;
  });

  afterAll(() => deleteTestUser(userId));

  it('creates a budget and returns it', async () => {
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Entertainment',
        amount: '200.00',
        currency: 'USD',
        period: 'monthly',
        startDate: '2024-01-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Entertainment');
    expect(res.body.data.amount).toBe('200.00');
    expect(typeof res.body.data.amount).toBe('string');
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'No amount or period' });

    expect(res.status).toBe(422);
  });
});
