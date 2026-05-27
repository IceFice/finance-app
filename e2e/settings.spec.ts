/**
 * Set-01 … Set-03 — Settings: страница, смена пароля, экспорт-кнопка.
 * (Префикс Set-, чтобы не путать с S-01..S-15 в security.spec.ts)
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';

// ── S-01: страница доступна и показывает имя/email пользователя ─────────────
test('Set-01: settings page shows user profile + sections', async ({ page }) => {
  const user = makeUser('settings');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /^настройки$/i })).toBeVisible();
  // fullName + email появляются и в UserPill топбара, и в строках «Профиль»
  // → используем .first() чтобы strict-mode локатор не падал на 2 совпадениях.
  await expect(page.getByText(user.fullName).first()).toBeVisible();
  await expect(page.getByText(user.email).first()).toBeVisible();
  // Все 4 секции
  await expect(page.getByText(/^профиль$/i)).toBeVisible();
  await expect(page.getByText(/^сменить пароль$/i)).toBeVisible();
  await expect(page.getByText(/^внешний вид$/i)).toBeVisible();
  await expect(page.getByText(/^данные$/i)).toBeVisible();
});

// ── S-02: смена пароля через форму → потом логин с новым ────────────────────
test('Set-02: change-password flow works end-to-end', async ({ page, request }) => {
  const user = makeUser('settings');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/settings');
  await page.getByLabel(/текущий пароль/i).fill(user.password);
  await page.getByLabel(/^новый пароль$/i).fill('NewPass1234!');
  await page.getByLabel(/повторите/i).fill('NewPass1234!');
  await page.getByRole('button', { name: /изменить пароль/i }).click();

  // Toast успеха
  await expect(page.getByText(/пароль изменён/i)).toBeVisible({ timeout: 5_000 });

  // Логин со старым → 401, с новым → 200
  const oldLogin = await request.post('http://localhost:4000/api/v1/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(oldLogin.status()).toBe(401);
  const newLogin = await request.post('http://localhost:4000/api/v1/auth/login', {
    data: { email: user.email, password: 'NewPass1234!' },
  });
  expect(newLogin.ok()).toBe(true);
});

// ── S-03: кнопка "Скачать JSON" присутствует и не падает при клике ──────────
test('Set-03: export-JSON button triggers a download', async ({ page }) => {
  const user = makeUser('settings');
  await apiRegister(user);
  await loginViaUI(page, user);
  await page.goto('/settings');

  const exportBtn = page.getByRole('button', { name: /скачать json/i });
  await expect(exportBtn).toBeVisible();
  // Ловим браузерный download promise параллельно с кликом
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    exportBtn.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/babkoschet-export-.*\.json/);
});
