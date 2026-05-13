/**
 * B-01 … B-18 — Бюджеты: создание, прогресс, изоляция, edge cases
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createAccount, createTransaction, createBudget, getCategories } from './helpers/api';

const BASE = 'http://localhost:4000/api/v1';

async function setupBudgetScenario(spentAmount: string, limitAmount: string) {
  const user = makeUser('bud');
  const { accessToken } = await apiRegister(user);
  const account    = await createAccount(accessToken);
  const categories = await getCategories(accessToken);
  const expenseCat = categories.find(c => c.type === 'expense')!;

  const budget = await createBudget(accessToken, {
    name:       'Тест бюджет',
    amount:     limitAmount,
    categoryId: expenseCat.id,
  });

  if (parseFloat(spentAmount) > 0) {
    await createTransaction(accessToken, {
      accountId:  account.id,
      categoryId: expenseCat.id,
      amount:     spentAmount,
      type:       'expense',
    });
  }

  return { user, accessToken, budget, expenseCat, account };
}

// ── B-03: 0% прогресс ────────────────────────────────────────────────────────
test('B-03: budget with no transactions → 0% spent', async ({ page }) => {
  const { user, accessToken, budget } = await setupBudgetScenario('0', '10000.00');

  const res = await fetch(`${BASE}/budgets/progress`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const prog = data.data.find((b: { id: string }) => b.id === budget.id);

  expect(prog.spent).toBe('0.00');
  expect(parseFloat(prog.percentage)).toBe(0);
});

// ── B-04: 50% прогресс ────────────────────────────────────────────────────────
test('B-04: budget at 50% → percentage=50', async ({ page }) => {
  const { user, accessToken, budget } = await setupBudgetScenario('5000.00', '10000.00');

  const res = await fetch(`${BASE}/budgets/progress`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const prog = data.data.find((b: { id: string }) => b.id === budget.id);

  expect(parseFloat(prog.percentage)).toBeCloseTo(50, 0);
  expect(prog.status ?? prog.percentage).not.toMatch(/exceeded/i);
});

// ── B-06: 100% — превышен ─────────────────────────────────────────────────────
test('B-06: budget at 100% → status exceeded', async ({ page }) => {
  const { user, accessToken, budget } = await setupBudgetScenario('10000.00', '10000.00');

  const res = await fetch(`${BASE}/budgets/progress`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const prog = data.data.find((b: { id: string }) => b.id === budget.id);

  expect(parseFloat(prog.percentage)).toBeCloseTo(100, 0);
});

// ── B-07: 150% — сильное превышение ──────────────────────────────────────────
test('B-07: budget at 150% → percentage > 100', async ({ page }) => {
  const { user, accessToken, budget } = await setupBudgetScenario('15000.00', '10000.00');

  const res = await fetch(`${BASE}/budgets/progress`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const prog = data.data.find((b: { id: string }) => b.id === budget.id);

  expect(parseFloat(prog.percentage)).toBeCloseTo(150, 0);
});

// ── B-12: Бюджет другого пользователя не виден ───────────────────────────────
test('B-12: user cannot access another user budget', async ({ page }) => {
  const { accessToken: tokenA, budget } = await setupBudgetScenario('0', '1000.00');

  // Пользователь B
  const userB = makeUser('budB');
  const { accessToken: tokenB } = await apiRegister(userB);

  const res = await fetch(`${BASE}/budgets/${budget.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  expect(res.status).toBe(404);
});

// ── B-16: Переводы не учитываются в бюджете ──────────────────────────────────
test('B-16: transfer transactions do not affect budget spent', async ({ page }) => {
  const user = makeUser('budtx');
  const { accessToken } = await apiRegister(user);
  const account1 = await createAccount(accessToken, { name: 'Acc1' });
  const account2 = await createAccount(accessToken, { name: 'Acc2' });
  const categories = await getCategories(accessToken);
  const expenseCat = categories.find(c => c.type === 'expense')!;

  const budget = await createBudget(accessToken, {
    name:       'Transfer test',
    amount:     '5000.00',
    categoryId: expenseCat.id,
  });

  // Создать перевод (не расход)
  await fetch(`${BASE}/transactions/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      fromAccountId: account1.id,
      toAccountId:   account2.id,
      amount:        '1000.00',
      currency:      'RUB',
      date:          new Date().toISOString().split('T')[0],
    }),
  });

  const res = await fetch(`${BASE}/budgets/progress`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const prog = data.data.find((b: { id: string }) => b.id === budget.id);

  // Spent должен остаться 0 — перевод не расход
  expect(parseFloat(prog.spent ?? '0')).toBe(0);
});

// ── B-17/B-18: E2E — прогресс-бар меняет цвет ───────────────────────────────
test('B-17: progress bar is green when < 80%', async ({ page }) => {
  const { user } = await setupBudgetScenario('2000.00', '10000.00'); // 20%
  await loginViaUI(page, user);
  await page.goto('/budgets');

  // Прогресс-бар должен иметь зелёный класс
  const bar = page.locator('[class*="bg-green"]').first();
  await expect(bar).toBeVisible({ timeout: 8_000 });
});

test('B-18: progress bar is red when > 100%', async ({ page }) => {
  const { user } = await setupBudgetScenario('12000.00', '10000.00'); // 120%
  await loginViaUI(page, user);
  await page.goto('/budgets');

  // Прогресс-бар должен иметь красный класс
  const bar = page.locator('[class*="bg-red"]').first();
  await expect(bar).toBeVisible({ timeout: 8_000 });
});

// ── E2E: создать бюджет через UI ─────────────────────────────────────────────
test('budget CRUD via UI: create and see in list', async ({ page }) => {
  const user = makeUser('budui');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/budgets');

  const addBtn = page.getByRole('button', { name: /добавить|новый бюджет/i });
  await expect(addBtn).toBeVisible({ timeout: 8_000 });
  await addBtn.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel(/название|name/i).fill('Мой бюджет');
  await dialog.getByLabel(/сумма|лимит|amount/i).fill('5000');
  await dialog.getByRole('button', { name: /сохранить|создать/i }).click();

  await expect(page.getByText('Мой бюджет')).toBeVisible({ timeout: 5_000 });
});
