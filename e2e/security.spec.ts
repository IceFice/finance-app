/**
 * S-01 … S-15 — Безопасность, изоляция, rate limiting, edge cases
 * Большинство проверок идут напрямую к API (без UI) для скорости.
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister } from './fixtures/auth';
import { createAccount, createTransaction } from './helpers/api';

const BASE = 'http://localhost:4000/api/v1';

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── S-01: SQL-инъекция в search ───────────────────────────────────────────────
test('S-01: SQL injection in search param → no data leak, no 500', async () => {
  const user = makeUser('sqli');
  const { accessToken } = await apiRegister(user);

  const payloads = [
    "' OR '1'='1",
    '"; DROP TABLE transactions; --',
    "1' UNION SELECT password_hash FROM users--",
  ];

  for (const payload of payloads) {
    const res = await fetch(
      `${BASE}/transactions?search=${encodeURIComponent(payload)}`,
      { headers: authHeader(accessToken) }
    );
    // Не 500, не утечка данных
    expect(res.status).toBeLessThan(500);
    const json = await res.json();
    // Если 200 — должен быть пустой массив (нет совпадений)
    if (res.status === 200) {
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(0);
    }
  }
});

// ── S-03/S-04/S-05: RLS — пользователь A не читает данные B ──────────────────
test('S-03: user A cannot read user B transactions', async () => {
  const userA = makeUser('rls-a');
  const userB = makeUser('rls-b');
  const { accessToken: tokenA } = await apiRegister(userA);
  const { accessToken: tokenB } = await apiRegister(userB);

  const accountB = await createAccount(tokenB, { name: 'B account' });
  const txB = await createTransaction(tokenB, { accountId: accountB.id, amount: '1000.00', type: 'expense' });

  // A пытается прочитать транзакцию B
  const res = await fetch(`${BASE}/transactions/${txB.id}`, {
    headers: authHeader(tokenA),
  });
  expect(res.status).toBe(404);
});

test('S-04: user A cannot update user B transaction', async () => {
  const userA = makeUser('rls-au');
  const userB = makeUser('rls-bu');
  const { accessToken: tokenA } = await apiRegister(userA);
  const { accessToken: tokenB } = await apiRegister(userB);

  const accountB = await createAccount(tokenB);
  const txB = await createTransaction(tokenB, { accountId: accountB.id, amount: '500.00', type: 'expense' });

  const res = await fetch(`${BASE}/transactions/${txB.id}`, {
    method: 'PUT',
    headers: authHeader(tokenA),
    body: JSON.stringify({ amount: '9999.00' }),
  });
  expect(res.status).toBe(404);
});

test('S-05: user A cannot delete user B account', async () => {
  const userA = makeUser('rls-ad');
  const userB = makeUser('rls-bd');
  const { accessToken: tokenA } = await apiRegister(userA);
  const { accessToken: tokenB } = await apiRegister(userB);

  const accountB = await createAccount(tokenB);

  const res = await fetch(`${BASE}/accounts/${accountB.id}`, {
    method: 'DELETE',
    headers: authHeader(tokenA),
  });
  expect(res.status).toBe(404);
});

// ── S-06: Rate limiting ───────────────────────────────────────────────────────
test('S-06: 6th auth request in window → 429', async () => {
  // Используем уникальный IP-подобный подход — все 6 запросов с одного IP
  const email = `ratelimit-${Date.now()}@test.local`;

  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'WrongPass!' }),
    });
    statuses.push(res.status);
  }

  // Хотя бы один 429 среди первых 6 запросов
  expect(statuses).toContain(429);
});

// ── S-07: Rate limit headers ──────────────────────────────────────────────────
test('S-07: rate limit headers present on auth endpoints', async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@test.local', password: 'pass' }),
  });
  // X-RateLimit-* или RateLimit-* (зависит от express-rate-limit версии)
  const hasRateLimitHeader =
    res.headers.has('x-ratelimit-limit') ||
    res.headers.has('ratelimit-limit') ||
    res.headers.has('retry-after');
  expect(hasRateLimitHeader).toBe(true);
});

// ── S-09: Подделанный cursor ──────────────────────────────────────────────────
test('S-09: tampered cursor → 422 validation error', async () => {
  const user = makeUser('cursor');
  const { accessToken } = await apiRegister(user);

  const res = await fetch(`${BASE}/transactions?cursor=NOT_VALID_BASE64!!!`, {
    headers: authHeader(accessToken),
  });
  expect(res.status).toBe(422);
});

// ── S-10: Валидный base64 cursor, но чужой ID ────────────────────────────────
test('S-10: valid base64 cursor with foreign ID → empty result (RLS)', async () => {
  const userA = makeUser('cursA');
  const userB = makeUser('cursB');
  const { accessToken: tokenA } = await apiRegister(userA);
  const { accessToken: tokenB } = await apiRegister(userB);

  const accountA = await createAccount(tokenA);
  const txA = await createTransaction(tokenA, { accountId: accountA.id, amount: '100.00', type: 'expense' });

  // Сделаем курсор, указывающий на транзакцию пользователя A
  const fakeCursor = Buffer.from(JSON.stringify({ date: txA.date, id: txA.id })).toString('base64url');

  const res = await fetch(`${BASE}/transactions?cursor=${fakeCursor}`, {
    headers: authHeader(tokenB),
  });
  expect(res.status).toBe(200);
  const json = await res.json();
  // Пользователь B ничего не видит из данных A
  expect(json.data.length).toBe(0);
});

// ── S-12: Новый пользователь — пустые ответы, не ошибки ─────────────────────
test('S-12: new user with no data → empty arrays, no 500', async () => {
  const user = makeUser('empty');
  const { accessToken } = await apiRegister(user);

  const endpoints = [
    '/accounts',
    '/transactions',
    '/budgets',
    '/categories',
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep}`, { headers: authHeader(accessToken) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  }
});

// ── S-13: Конкурентное удаление ───────────────────────────────────────────────
test('S-13: concurrent delete → first 200, second 404', async () => {
  const user = makeUser('conc');
  const { accessToken } = await apiRegister(user);
  const account = await createAccount(accessToken);
  const tx = await createTransaction(accessToken, { accountId: account.id, amount: '100.00', type: 'expense' });

  const [res1, res2] = await Promise.all([
    fetch(`${BASE}/transactions/${tx.id}`, { method: 'DELETE', headers: authHeader(accessToken) }),
    fetch(`${BASE}/transactions/${tx.id}`, { method: 'DELETE', headers: authHeader(accessToken) }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  expect(statuses).toContain(200);
  expect(statuses).toContain(404);
});

// ── S-14: Security headers от helmet ─────────────────────────────────────────
test('S-14: security headers present (helmet)', async () => {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: 'Bearer invalid' },
  });
  expect(res.headers.has('x-content-type-options')).toBe(true);
  expect(res.headers.has('x-frame-options')).toBe(true);
  // CSP
  expect(
    res.headers.has('content-security-policy') ||
    res.headers.has('x-xss-protection')
  ).toBe(true);
});

// ── S-15: Нет password_hash в /auth/me ───────────────────────────────────────
test('S-15: /auth/me does not expose password_hash', async () => {
  const user = makeUser('me');
  const { accessToken } = await apiRegister(user);

  const res  = await fetch(`${BASE}/auth/me`, { headers: authHeader(accessToken) });
  const json = await res.json();
  const body = JSON.stringify(json);

  expect(body).not.toContain('password_hash');
  expect(body).not.toContain('password');
});

// ── Доступ без токена → 401 ───────────────────────────────────────────────────
test('S: protected endpoints require auth token', async () => {
  const protectedEndpoints = [
    '/accounts',
    '/transactions',
    '/budgets',
    '/reports/monthly-summary?from=2024-01-01&to=2024-01-31',
    '/auth/me',
  ];

  for (const ep of protectedEndpoints) {
    const res = await fetch(`${BASE}${ep}`);
    expect(res.status).toBe(401);
  }
});
