/**
 * I-01 … I-03 — CSV-импорт: drop file, dedupe, ошибки.
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createAccount } from './helpers/api';

const CSV = `date,amount,type,merchant,description
2026-05-10,1500,expense,Surf Coffee,Coffee
2026-05-11,3200,expense,Перекрёсток,Groceries
2026-05-12,80000,income,ООО Контур,Зарплата
`;

// ── I-01: страница рендерится с drag-n-drop состоянием ──────────────────────
test('I-01: import page renders drop zone', async ({ page }) => {
  const user = makeUser('imp');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/import');
  await expect(page.getByRole('heading', { name: /импорт операций/i })).toBeVisible();
  await expect(page.getByText(/перетащите csv сюда/i)).toBeVisible();
});

// ── I-02: загрузка CSV → preview → импорт → результат ──────────────────────
test('I-02: CSV upload → mapping → import → success summary', async ({ page }) => {
  const user = makeUser('imp');
  const { accessToken } = await apiRegister(user);
  const acc = await createAccount(accessToken, { name: 'Карта' });
  await loginViaUI(page, user);

  await page.goto('/import');
  // Подсовываем CSV в hidden input
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf-8'),
  });

  // Появилась таблица превью + селект счёта
  await expect(page.getByText(/сопоставьте колонки/i)).toBeVisible({ timeout: 5_000 });
  await page.getByLabel(/^счёт$/i).selectOption(acc.id);

  // Жмём импорт — кнопка содержит число валидных строк
  const importBtn = page.getByRole('button', { name: /импортировать \d+/i });
  await expect(importBtn).toBeEnabled();
  await importBtn.click();

  // Toast и блок Результат
  await expect(page.getByText(/^результат$/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/добавлено/i).first()).toBeVisible();
});

// ── I-03: повторный импорт того же CSV → все строки skipped (dedupe) ────────
test('I-03: re-importing the same CSV → all rows skipped by dedupe', async ({ page }) => {
  const user = makeUser('imp');
  const { accessToken } = await apiRegister(user);
  const acc = await createAccount(accessToken, { name: 'Карта' });
  await loginViaUI(page, user);

  // Первый импорт
  await page.goto('/import');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf-8'),
  });
  await page.getByLabel(/^счёт$/i).selectOption(acc.id);
  await page.getByRole('button', { name: /импортировать \d+/i }).click();
  await expect(page.getByText(/^результат$/i)).toBeVisible({ timeout: 10_000 });

  // Сбрасываем и грузим тот же файл повторно
  await page.getByRole('button', { name: /загрузить другой файл/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sample.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf-8'),
  });
  await page.getByLabel(/^счёт$/i).selectOption(acc.id);
  await page.getByRole('button', { name: /импортировать \d+/i }).click();

  // Все строки должны попасть в "Пропущено (дубликаты)" = 3
  await expect(page.getByText(/^результат$/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('div').filter({ hasText: /^пропущено \(дубликаты\)/i }).locator('div').last()).toHaveText('3');
});
