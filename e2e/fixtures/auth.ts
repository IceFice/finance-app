import { test as base, expect, type Page } from '@playwright/test';

// ── Типы ────────────────────────────────────────────────────────────────────

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
}

// ── Фабрика уникальных пользователей ────────────────────────────────────────

let seq = 0;
export function makeUser(prefix = 'qa'): TestUser {
  const id = `${Date.now()}-${++seq}`;
  return {
    email:    `${prefix}-${id}@test.local`,
    password: 'Test1234!',
    fullName: `QA User ${id}`,
  };
}

// ── API-хелперы (прямые запросы, минуя UI) ──────────────────────────────────

const API = 'http://localhost:4000/api/v1';

export async function apiRegister(user: TestUser): Promise<{ accessToken: string }> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.data.accessToken };
}

export async function apiLogin(email: string, password: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const json = await res.json();
  return { accessToken: json.data.accessToken };
}

// ── Инъекция accessToken в localStorage страницы ────────────────────────────
// AuthContext хранит токен в памяти — нам нужна полноценная сессия через UI.
// Самый надёжный способ — зайти через форму.

export async function loginViaUI(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill(user.password);
  await page.getByRole('button', { name: /войти/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

// ── Расширенная фикстура ─────────────────────────────────────────────────────

interface AuthFixtures {
  user: TestUser;
  loggedInPage: Page;
}

export const test = base.extend<AuthFixtures>({
  user: async ({}, use) => {
    const u = makeUser();
    await apiRegister(u);
    await use(u);
    // teardown: удаление пользователя через API если нужно
  },

  loggedInPage: async ({ page, user }, use) => {
    await loginViaUI(page, user);
    await use(page);
  },
});

export { expect };
