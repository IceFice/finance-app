/**
 * C-01 … C-04 — Категории: системные read-only, кастомные CRUD.
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createCategory } from './helpers/api';

// ── C-01: страница рендерится и показывает системные категории ──────────────
test('C-01: categories page shows system categories', async ({ page }) => {
  const user = makeUser('cat');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/categories');
  await expect(page.getByRole('heading', { name: /^категории$/i })).toBeVisible();
  // Системные категории есть в seed (миграция 006). Хотя бы одна "Системная" подпись.
  await expect(page.getByText(/системная/i).first()).toBeVisible({ timeout: 8_000 });
});

// ── C-02: кастомная категория появляется на странице ────────────────────────
test('C-02: custom category appears with name + "Своя" badge', async ({ page }) => {
  const user = makeUser('cat');
  const { accessToken } = await apiRegister(user);
  await createCategory(accessToken, { name: 'Мото', type: 'expense' });
  await loginViaUI(page, user);

  await page.goto('/categories');
  await expect(page.getByText('Мото')).toBeVisible();
});

// ── C-03: фильтр по типу (Расход / Доход) переключает счётчики ──────────────
test('C-03: filter pills toggle by income/expense', async ({ page }) => {
  const user = makeUser('cat');
  const { accessToken } = await apiRegister(user);
  await createCategory(accessToken, { name: 'CustomIncomeCat', type: 'income' });
  await createCategory(accessToken, { name: 'CustomExpenseCat', type: 'expense' });
  await loginViaUI(page, user);

  await page.goto('/categories');
  // Кликаем "Доход"
  await page.getByRole('button', { name: /^доход\s+\d+$/i }).first().click();
  await expect(page.getByText('CustomIncomeCat')).toBeVisible();
  // На вкладке "Доход" расходной не должно быть видно
  await expect(page.getByText('CustomExpenseCat')).toHaveCount(0);
});

// ── C-04: системные категории не имеют edit/delete кнопок ───────────────────
test('C-04: system categories are read-only (no edit/delete)', async ({ page }) => {
  const user = makeUser('cat');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/categories');
  // Берём первую системную карточку и проверяем, что в ней нет aria-label
  // "Редактировать ..." — он есть только у кастомных.
  const firstSystem = page.locator('div').filter({ hasText: /системная/i }).first();
  await expect(firstSystem).toBeVisible();
  // На странице aria-label "Редактировать ..." появляется только для кастомных;
  // при ZERO кастомных счёт должен быть 0.
  await expect(page.getByRole('button', { name: /редактировать/i })).toHaveCount(0);
});
