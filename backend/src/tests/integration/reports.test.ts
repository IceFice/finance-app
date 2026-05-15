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
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach((m: object) => {
      expect(m).toHaveProperty('income');
      expect(m).toHaveProperty('expenses');
      expect(m).toHaveProperty('net');
    });
  });

  it('aggregates income and expenses correctly', async () => {
    const res = await request(app)
      .get('/api/v1/reports/monthly-summary?from=2024-01-01&to=2024-02-28')
      .set('Authorization', `Bearer ${accessToken}`);

    const rows: Array<{ income: string; expenses: string; net: string }> = res.body.data;
    const sum = (k: 'income' | 'expenses' | 'net') =>
      rows.reduce((s, r) => s + parseFloat(r[k]), 0);
    // Total income: 3000 + 3500 = 6500
    expect(sum('income')).toBe(6500);
    // Total expenses: 500 + 300 + 800 = 1600
    expect(sum('expenses')).toBe(1600);
    // Net: 6500 - 1600 = 4900
    expect(sum('net')).toBe(4900);
  });

  it('returns all monetary values as strings', async () => {
    const res = await request(app)
      .get('/api/v1/reports/monthly-summary?from=2024-01-01&to=2024-01-31')
      .set('Authorization', `Bearer ${accessToken}`);

    const months = res.body.data;
    expect(Array.isArray(months)).toBe(true);
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
    const totalIncome = (res.body.data as Array<{ income: string }>)
      .reduce((s, r) => s + parseFloat(r.income), 0);
    expect(totalIncome).toBeLessThan(99999);
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
    const cats = res.body.data;
    expect(Array.isArray(cats)).toBe(true);
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

    const cats = res.body.data;
    const total = cats.reduce((sum: number, c: { percentage: string }) => sum + parseFloat(c.percentage), 0);
    // Allow ±1 for rounding
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(1);
  });

  it('grandTotal equals sum of category totals', async () => {
    const res = await request(app)
      .get('/api/v1/reports/spending-by-category?from=2024-03-01&to=2024-03-31')
      .set('Authorization', `Bearer ${accessToken}`);

    const categories: Array<{ total: string }> = res.body.data;
    const sumFromCats = categories.reduce((s, c) => s + parseFloat(c.total), 0);
    const grandTotal = categories.reduce((s, c) => s + parseFloat(c.total), 0);
    expect(Math.abs(sumFromCats - grandTotal)).toBeLessThan(0.01);
  });
});
