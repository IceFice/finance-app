/**
 * R-01 … R-15 — Отчёты: monthly summary, spending by category, cash flow, изоляция
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createAccount, createTransaction, getCategories } from './helpers/api';

const BASE    = 'http://localhost:4000/api/v1';
const TODAY   = new Date();
const FROM    = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-01`;
const TO      = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${
  new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate()
}`;

async function setupReportData() {
  const user = makeUser('rep');
  const { accessToken } = await apiRegister(user);
  const account    = await createAccount(accessToken);
  const categories = await getCategories(accessToken);
  const expCat     = categories.find(c => c.type === 'expense')!;
  const incCat     = categories.find(c => c.type === 'income')!;
  return { user, accessToken, account, expCat, incCat };
}

// ── R-01/R-02/R-03: Monthly summary ──────────────────────────────────────────
test('R-01/R-02/R-03: monthly summary income, expense, net', async () => {
  const { accessToken, account, expCat, incCat } = await setupReportData();

  await createTransaction(accessToken, { accountId: account.id, categoryId: incCat.id,  amount: '50000.00', type: 'income'  });
  await createTransaction(accessToken, { accountId: account.id, categoryId: expCat.id,  amount: '20000.00', type: 'expense' });
  await createTransaction(accessToken, { accountId: account.id, categoryId: expCat.id,  amount:  '5000.00', type: 'expense' });

  const res = await fetch(`${BASE}/reports/monthly-summary?from=${FROM}&to=${TO}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok).toBe(true);
  const { data } = await res.json();

  // income
  const income = Array.isArray(data) ? data : [data];
  const totalIncome   = income.reduce((s: number, m: { income: string })   => s + parseFloat(m.income), 0);
  const totalExpenses = income.reduce((s: number, m: { expenses: string }) => s + parseFloat(m.expenses), 0);

  expect(totalIncome).toBeCloseTo(50000, 1);
  expect(totalExpenses).toBeCloseTo(25000, 1);
  // net = income - expenses
  const net = income.reduce((s: number, m: { net: string }) => s + parseFloat(m.net), 0);
  expect(net).toBeCloseTo(25000, 1);
});

// ── R-04: Переводы исключены из summary ──────────────────────────────────────
test('R-04: transfer transactions excluded from monthly summary', async () => {
  const { accessToken, account } = await setupReportData();
  const account2 = await createAccount(accessToken, { name: 'Acc2' });

  // Доход 10 000
  const categories = await getCategories(accessToken);
  const incCat = categories.find(c => c.type === 'income')!;
  await createTransaction(accessToken, { accountId: account.id, categoryId: incCat.id, amount: '10000.00', type: 'income' });

  // Перевод 5 000 между счетами
  await fetch(`${BASE}/transactions/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      fromAccountId: account.id,
      toAccountId:   account2.id,
      amount:        '5000.00',
      currency:      'RUB',
      date:          FROM,
    }),
  });

  const res  = await fetch(`${BASE}/reports/monthly-summary?from=${FROM}&to=${TO}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const { data } = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  const totalIncome   = rows.reduce((s: number, m: { income: string })   => s + parseFloat(m.income), 0);
  const totalExpenses = rows.reduce((s: number, m: { expenses: string }) => s + parseFloat(m.expenses), 0);

  // Перевод не входит ни в доход ни в расход
  expect(totalIncome).toBeCloseTo(10000, 1);
  expect(totalExpenses).toBeCloseTo(0, 1);
});

// ── R-05: Пустой период → нули, не ошибка ────────────────────────────────────
test('R-05: empty period returns zeros, not 500', async () => {
  const { accessToken } = await setupReportData();

  const res = await fetch(`${BASE}/reports/monthly-summary?from=2000-01-01&to=2000-01-31`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.status).toBe(200);
  const { data } = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  // Все нули
  rows.forEach((m: { income: string; expenses: string }) => {
    expect(parseFloat(m.income)).toBe(0);
    expect(parseFloat(m.expenses)).toBe(0);
  });
});

// ── R-06/R-07: Spending by category ──────────────────────────────────────────
test('R-06/R-07: spending by category amounts and percentages', async () => {
  const { accessToken, account, expCat } = await setupReportData();

  await createTransaction(accessToken, { accountId: account.id, categoryId: expCat.id, amount: '3000.00', type: 'expense' });
  await createTransaction(accessToken, { accountId: account.id, categoryId: expCat.id, amount: '7000.00', type: 'expense' });

  const res = await fetch(`${BASE}/reports/spending-by-category?from=${FROM}&to=${TO}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok).toBe(true);
  const { data } = await res.json();
  const rows: Array<{ total: string; percentage: string }> = Array.isArray(data) ? data : [];

  // Всего расходов = 10 000
  const grandTotal = rows.reduce((s, r) => s + parseFloat(r.total), 0);
  expect(grandTotal).toBeCloseTo(10000, 1);

  // Сумма процентов ≈ 100
  const totalPct = rows.reduce((s, r) => s + parseFloat(r.percentage), 0);
  expect(totalPct).toBeCloseTo(100, 0);
});

// ── R-11: Изоляция — данные другого пользователя не видны ────────────────────
test('R-11: reports only show own data (isolation)', async () => {
  const { accessToken: tokenA, account: accA } = await setupReportData();
  const { accessToken: tokenB } = await setupReportData();

  // Пользователь A создаёт транзакцию
  const categories = await getCategories(tokenA);
  const incCat = categories.find(c => c.type === 'income')!;
  await createTransaction(tokenA, { accountId: accA.id, categoryId: incCat.id, amount: '99999.00', type: 'income' });

  // Пользователь B смотрит отчёт — не должен видеть данные A
  const res = await fetch(`${BASE}/reports/monthly-summary?from=${FROM}&to=${TO}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const { data } = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  const totalIncome = rows.reduce((s: number, m: { income: string }) => s + parseFloat(m.income), 0);
  expect(totalIncome).toBe(0); // B не видит 99 999 пользователя A
});

// ── R-09: Cash flow гранулярность month ──────────────────────────────────────
test('R-09: cash-flow with monthly granularity returns correct points', async () => {
  const { accessToken } = await setupReportData();

  const yearFrom = `${TODAY.getFullYear()}-01-01`;
  const yearTo   = `${TODAY.getFullYear()}-12-31`;

  const res = await fetch(
    `${BASE}/reports/cash-flow?from=${yearFrom}&to=${yearTo}&granularity=month`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  expect(res.ok).toBe(true);
  const { data } = await res.json();
  const rows: unknown[] = Array.isArray(data) ? data : [];
  // Должно быть 12 точек (по одной на месяц)
  expect(rows.length).toBe(12);
});

// ── R-14/R-15: E2E — отчёты отображаются в браузере ─────────────────────────
test('R-14: reports page renders chart tabs', async ({ page }) => {
  const user = makeUser('repui');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/reports');
  // Вкладки должны быть видны
  await expect(page.getByRole('tab', { name: /обзор|overview/i })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('tab', { name: /категори|category/i })).toBeVisible();
});

test('R-15: changing date range triggers data reload', async ({ page }) => {
  const { user } = await setupReportData();
  await loginViaUI(page, user);

  await page.goto('/reports');

  // Ждём появления кнопок выбора периода
  const thisMonth = page.getByRole('button', { name: /этот месяц|this month/i });
  await expect(thisMonth).toBeVisible({ timeout: 8_000 });

  // Перехватим сетевой запрос при смене периода
  const [req] = await Promise.all([
    page.waitForRequest(r => r.url().includes('/reports/') && r.method() === 'GET'),
    page.getByRole('button', { name: /3 месяца|last 3|прошлые/i }).click().catch(() =>
      page.getByRole('button').filter({ hasText: /месяц/i }).nth(1).click()
    ),
  ]);
  expect(req.url()).toContain('from=');
});
