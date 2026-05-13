import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import {
  createTestUser, deleteTestUser,
  createTestAccount, createTestCategory,
  createTestTransaction, loginTestUser,
} from '../helpers/db';

describe('GET /api/v1/reports/monthly-summary', () => {
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

    // Seed known transactions for Jan 2024
    await createTestTransaction(userId, accountId, { amount: '3000.00', type: 'credit', date: '2024-01-15' });
    await createTestTransaction(userId, accountId, { amount:  '500.00', type: 'debit',  date: '2024-01-10' });
    await createTestTransaction(userId, accountId, { amount:  '300.00', type: 'debit',  date: '2024-01-20' });
    // Feb 2024
    await createTestTransaction(userId, accountId, { amount: '3500.00', type: 'credit', date: '2024-02-14' });
    await createTestTransaction(userId, accountId, { amount:  '800.00', type: 'debit',  date: '2024-02-20' });
  });

  afterAll(() => deleteTestUser(userId));

  it('returns monthly breakdown and totals', async () => {
    const res = await request(app)
      .get('/api/v1/reports/monthly-summary?from=2024-01-01&to=2024-02-28')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.months).toBeInstanceOf(Array);
    expect(res.body.data.totals).toHaveProperty('income');
    expect(res.body.data.totals).toHaveProperty('expenses');
    expect(res.body.data.totals).toHaveProperty('net');
  });

  it('aggregates income and expenses correctly', async () => {
    const res = await request(app)
      .get('/api/v1/reports/monthly-summary?from=2024-01-01&to=2024-02-28')
      .set('Authorization', `Bearer ${accessToken}`);

    const { totals } = res.body.data;
    // Total income: 3000 + 3500 = 6500
    expect(parseFloat(totals.income)).toBe(6500);
    // Total expenses: 500 + 300 + 800 = 1600
    expect(parseFloat(totals.expenses)).toBe(1600);
    // Net: 6500 - 1600 = 4900
    expect(parseFloat(totals.net)).toBe(4900);
  });

  it('returns all monetary values as strings', async () => {
    const res = await request(app)
      .get('/api/v1/reports/monthly-summary?from=2024-01-01&to=2024-01-31')
      .set('Authorization', `Bearer ${accessToken}`);

    const { totals, months } = res.body.data;
    expect(typeof totals.income).toBe('string');
    expect(typeof totals.expenses).toBe('string');
    expect(typeof totals.net).toBe('string');
    months.forEach((m: { income: unknown; expenses: unknown; net: unknown }) => {
      expect(typeof m.income).toBe('string');
      expect(typeof m.expenses).toBe('string');
      expect(typeof m.net).toBe('string');
    });
  });

  it('returns 422 for missing from/to params', async () => {
    const res = await request(app)
      .get('/api/v1/reports/monthly-summary')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('isolates data to the authenticated user only', async () => {
    const other = await createTestUser();
    const otherAccount = await createTestAccount(other.id);
    // Other user has $99999 income
    await createTestTransaction(other.id, otherAccount, {
      amount: '99999.00', type: 'credit', date: '2024-01-15',
    });

    const res = await request(app)
      .get('/api/v1/reports/monthly-summary?from=2024-01-01&to=2024-01-31')
      .set('Authorization', `Bearer ${accessToken}`);

    // Our user's income should be 3000, not 99999+
    expect(parseFloat(res.body.data.totals.income)).toBeLessThan(99999);
    await deleteTestUser(other.id);
  });
});

describe('GET /api/v1/reports/spending-by-category', () => {
  let userId: string;
  let accessToken: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    const accountId = await createTestAccount(userId);
    const agent = request.agent(app);
    const tokens = await loginTestUser(agent, user.email, user.password);
    accessToken = tokens.accessToken;

    const foodCatId = await createTestCategory({ userId, name: 'Food',      type: 'expense' });
    const transCatId = await createTestCategory({ userId, name: 'Transport', type: 'expense' });

    await createTestTransaction(userId, accountId, { amount: '200.00', type: 'debit', categoryId: foodCatId,  date: '2024-03-01' });
    await createTestTransaction(userId, accountId, { amount: '300.00', type: 'debit', categoryId: foodCatId,  date: '2024-03-10' });
    await createTestTransaction(userId, accountId, { amount: '100.00', type: 'debit', categoryId: transCatId, date: '2024-03-05' });
  });

  afterAll(() => deleteTestUser(userId));

  it('returns categories sorted by total descending', async () => {
    const res = await request(app)
      .get('/api/v1/reports/spending-by-category?from=2024-03-01&to=2024-03-31')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const cats = res.body.data.categories;
    expect(cats.length).toBeGreaterThanOrEqual(2);
    // Food (500) should come before Transport (100)
    const foodIdx  = cats.findIndex((c: { categoryName: string }) => c.categoryName === 'Food');
    const transIdx = cats.findIndex((c: { categoryName: string }) => c.categoryName === 'Transport');
    expect(foodIdx).toBeLessThan(transIdx);
  });

  it('percentages sum to 100', async () => {
    const res = await request(app)
      .get('/api/v1/reports/spending-by-category?from=2024-03-01&to=2024-03-31')
      .set('Authorization', `Bearer ${accessToken}`);

    const cats = res.body.data.categories;
    const total = cats.reduce((sum: number, c: { pct: string }) => sum + parseFloat(c.pct), 0);
    // Allow ±1 for rounding
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(1);
  });

  it('grandTotal equals sum of category totals', async () => {
    const res = await request(app)
      .get('/api/v1/reports/spending-by-category?from=2024-03-01&to=2024-03-31')
      .set('Authorization', `Bearer ${accessToken}`);

    const { categories, grandTotal } = res.body.data;
    const sumFromCats = categories.reduce((s: number, c: { total: string }) => s + parseFloat(c.total), 0);
    expect(Math.abs(sumFromCats - parseFloat(grandTotal))).toBeLessThan(0.01);
  });
});
