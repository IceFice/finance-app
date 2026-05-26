/**
 * A-01 … A-23 — Auth flows
 * Сценарии: регистрация, вход, logout, refresh, lockout, token-edge-cases
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { AuthPage } from './pages/AuthPage';

// ── A-01: Успешная регистрация ───────────────────────────────────────────────
test('A-01: register with valid data → redirect to dashboard', async ({ page }) => {
  const user = makeUser('reg');
  const auth = new AuthPage(page);
  await auth.gotoRegister();
  await auth.register(user.fullName, user.email, user.password);
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  // Имя пользователя должно быть в интерфейсе
  await expect(page.getByText(user.fullName, { exact: false })).toBeVisible();
});

// ── A-02: Дублирующий email → 409 ────────────────────────────────────────────
test('A-02: register with duplicate email → error shown', async ({ page }) => {
  const user = makeUser('dup');
  await apiRegister(user);           // уже существует

  const auth = new AuthPage(page);
  await auth.gotoRegister();
  await auth.register(user.fullName, user.email, user.password);
  await auth.expectServerError(/уже зарегистрирован|already registered|email/i);
});

// ── A-03: Слабый пароль → валидация ──────────────────────────────────────────
test('A-03: register with short password → validation error', async ({ page }) => {
  const auth = new AuthPage(page);
  await auth.gotoRegister();
  await page.getByLabel('Имя').fill('John');
  await page.getByLabel('Email').fill('any@test.local');
  await page.getByLabel('Пароль').first().fill('abc');
  await page.getByLabel('Повторите пароль').fill('abc');
  await page.getByRole('button', { name: /создать аккаунт/i }).click();
  // Ошибка под полем пароля
  await expect(page.getByText(/минимум 8/i)).toBeVisible();
  await expect(page).not.toHaveURL('**/dashboard');
});

// ── A-04: Невалидный email ────────────────────────────────────────────────────
test('A-04: register with invalid email → validation error', async ({ page }) => {
  const auth = new AuthPage(page);
  await auth.gotoRegister();
  await page.getByLabel('Имя').fill('John');
  await page.getByLabel('Email').fill('notanemail');
  await page.getByLabel('Пароль').first().fill('Test1234!');
  await page.getByLabel('Повторите пароль').fill('Test1234!');
  await page.getByRole('button', { name: /создать аккаунт/i }).click();
  await expect(page.getByText(/формат email/i)).toBeVisible();
});

// ── A-05: Успешный вход ───────────────────────────────────────────────────────
test('A-05: login with valid credentials → dashboard', async ({ page }) => {
  const user = makeUser('login');
  await apiRegister(user);

  const auth = new AuthPage(page);
  await auth.gotoLogin();
  await auth.login(user.email, user.password);
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
});

// ── A-06: Неверный пароль → 401 ──────────────────────────────────────────────
test('A-06: login with wrong password → error, no dashboard', async ({ page }) => {
  const user = makeUser('wp');
  await apiRegister(user);

  const auth = new AuthPage(page);
  await auth.gotoLogin();
  await auth.login(user.email, 'WrongPass999!');
  await auth.expectServerError(/неверный|invalid|пароль|password/i);
  await expect(page).not.toHaveURL('**/dashboard');
});

// ── A-07: Несуществующий email ────────────────────────────────────────────────
test('A-07: login with non-existent email → same error as wrong password', async ({ page }) => {
  const auth = new AuthPage(page);
  await auth.gotoLogin();
  await auth.login('nobody@nowhere.test', 'Test1234!');
  await auth.expectServerError(/неверный|invalid/i);
});

// ── A-20: Полный E2E flow: регистрация → дашборд ─────────────────────────────
test('A-20: full registration flow → dashboard shows user name', async ({ page }) => {
  const user = makeUser('full');
  const auth = new AuthPage(page);
  await auth.gotoRegister();
  await auth.register(user.fullName, user.email, user.password);
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  await expect(page.getByText(user.fullName, { exact: false })).toBeVisible();
  // Карточки дашборда должны быть видны
  await expect(page.getByText(/баланс|balance/i).first()).toBeVisible();
});

// ── A-21: Logout → редирект на /login ────────────────────────────────────────
test('A-21: logout → redirect to login, session cleared', async ({ page }) => {
  const user = makeUser('lo');
  await apiRegister(user);
  await loginViaUI(page, user);

  // Ищем кнопку выхода в сайдбаре или меню
  const logoutBtn = page.getByRole('button', { name: /выход|logout|выйти/i });
  await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
  await logoutBtn.click();

  await page.waitForURL('**/login', { timeout: 8_000 });
  // Попытка перейти на дашборд → редирект обратно
  await page.goto('/dashboard');
  await page.waitForURL('**/login');
});

// ── A-23: Гость не может попасть на /dashboard ───────────────────────────────
test('A-23: unauthenticated access to /dashboard → redirect to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL('**/login', { timeout: 8_000 });
});

// ── Landing → ссылки ведут на нужные страницы ────────────────────────────────
test('landing page links: login and register work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Кнопка "Войти"
  await page.getByRole('link', { name: /войти/i }).first().click();
  await page.waitForURL('**/login');

  await page.goto('/');
  // Главный CTA — "Начать бесплатно" (новый лендинг DR-8). Старая копия
  // была "Создать аккаунт"; роутинг тот же — /register.
  await page.getByRole('link', { name: /начать бесплатно|создать аккаунт/i }).first().click();
  await page.waitForURL('**/register');
});

// ── Авторизованный пользователь перенаправляется с / → /dashboard ────────────
test('authenticated user on landing page → auto redirect to dashboard', async ({ page }) => {
  const user = makeUser('auto');
  await apiRegister(user);
  await loginViaUI(page, user);

  // Зашли в дашборд — теперь идём на главную
  await page.goto('/');
  await page.waitForURL('**/dashboard', { timeout: 8_000 });
});
