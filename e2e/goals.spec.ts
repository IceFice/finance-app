/**
 * G-01 … G-04 — Цели накопления: render, CRUD, sidebar widget.
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createGoal, createAccount } from './helpers/api';

// ── G-01: страница без целей показывает empty-state ─────────────────────────
test('G-01: empty goals page → "Целей пока нет"', async ({ page }) => {
  const user = makeUser('goal');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/goals');
  await expect(page.getByRole('heading', { name: /цели накопления/i })).toBeVisible();
  await expect(page.getByText(/целей пока нет/i)).toBeVisible();
  // CTA "Создать цель" присутствует
  await expect(page.getByRole('button', { name: /создать цель/i })).toBeVisible();
});

// ── G-02: цель, созданная через API, появляется на странице ──────────────────
test('G-02: existing goal renders with name + target', async ({ page }) => {
  const user = makeUser('goal');
  const { accessToken } = await apiRegister(user);
  await createGoal(accessToken, { name: 'Отпуск 2026', targetAmount: '60000.00' });
  await loginViaUI(page, user);

  await page.goto('/goals');
  await expect(page.getByText('Отпуск 2026')).toBeVisible();
  // 60 000 ₽ форматируется с пробелом-разделителем (NBSP) → regex с . для любого пробела
  await expect(page.getByText(/60.000/).first()).toBeVisible();
});

// ── G-03: SavingsMini в сайдбаре подхватывает первую активную цель ──────────
test('G-03: sidebar SavingsMini shows the first active goal', async ({ page }) => {
  const user = makeUser('goal');
  const { accessToken } = await apiRegister(user);
  await createGoal(accessToken, { name: 'Macbook', targetAmount: '120000.00', currentAmount: '30000.00' });
  await loginViaUI(page, user);

  // Сайдбар виден на /dashboard — стандартный AppLayout.
  await expect(page.getByRole('link', { name: /macbook/i }).first()).toBeVisible({ timeout: 8_000 });
});

// ── G-04: цель с источником-счётом отражает баланс счёта как current ────────
test('G-04: goal linked to source account uses its balance', async ({ page }) => {
  const user = makeUser('goal');
  const { accessToken } = await apiRegister(user);
  const acc = await createAccount(accessToken, {
    name: 'Заначка', type: 'savings', balance: '25000.00',
  });
  await createGoal(accessToken, {
    name: 'Подушка', targetAmount: '100000.00', sourceAccountId: acc.id,
  });
  await loginViaUI(page, user);

  await page.goto('/goals');
  // Карточка с именем цели + ожидаем 25% (25k / 100k)
  await expect(page.getByText('Подушка')).toBeVisible();
  await expect(page.getByText(/25\s*%/).first()).toBeVisible();
});
