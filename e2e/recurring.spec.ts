/**
 * Rec-01 … Rec-04 — Регулярные платежи: render, create via API, Apply now,
 * автоматическая материализация в transactions.
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createAccount, createRecurring } from './helpers/api';

const BASE = 'http://localhost:4000/api/v1';

// ── Rec-01: пустая страница показывает empty-state ──────────────────────────
test('Rec-01: empty recurring page → "Регулярных платежей нет"', async ({ page }) => {
  const user = makeUser('rec');
  await apiRegister(user);
  await loginViaUI(page, user);

  await page.goto('/recurring');
  await expect(page.getByRole('heading', { name: /регулярные платежи/i })).toBeVisible();
  await expect(page.getByText(/регулярных платежей нет/i)).toBeVisible();
});

// ── Rec-02: рекуррент, созданный через API, виден на странице ──────────────
test('Rec-02: existing recurring renders with merchant + amount', async ({ page }) => {
  const user = makeUser('rec');
  const { accessToken } = await apiRegister(user);
  const acc = await createAccount(accessToken);
  await createRecurring(accessToken, {
    accountId: acc.id, amount: '999.00', type: 'debit', merchant: 'Spotify',
  });
  await loginViaUI(page, user);

  await page.goto('/recurring');
  await expect(page.getByText('Spotify')).toBeVisible();
  await expect(page.getByText(/999/).first()).toBeVisible();
});

// ── Rec-03: POST /recurring/apply создаёт реальную транзакцию ───────────────
test('Rec-03: apply-due endpoint materializes one transaction', async ({ request }) => {
  const user = makeUser('rec');
  const { accessToken } = await apiRegister(user);
  const acc = await createAccount(accessToken);
  // start_date = вчера → next_due_date уже наступило, доступно к применению
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await createRecurring(accessToken, {
    accountId: acc.id, amount: '450.00', type: 'debit',
    merchant: 'Аренда', startDate: yesterday,
  });

  const apply = await request.post(`${BASE}/recurring/apply`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(apply.ok()).toBe(true);
  const out = await apply.json();
  expect(out.data.created).toBe(1);

  // Проверяем что транзакция действительно создалась
  const list = await request.get(`${BASE}/transactions?limit=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const txs = (await list.json()).data;
  expect(txs.some((t: { merchant?: string }) => t.merchant === 'Аренда')).toBe(true);
});

// ── Rec-04: повторный вызов apply сразу после → 0 новых (next_due ушёл вперёд)
test('Rec-04: applying twice in a row → second call creates 0', async ({ request }) => {
  const user = makeUser('rec');
  const { accessToken } = await apiRegister(user);
  const acc = await createAccount(accessToken);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await createRecurring(accessToken, {
    accountId: acc.id, amount: '100.00', type: 'debit',
    merchant: 'Twice', startDate: yesterday, frequency: 'monthly',
  });

  const a1 = await request.post(`${BASE}/recurring/apply`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect((await a1.json()).data.created).toBe(1);

  const a2 = await request.post(`${BASE}/recurring/apply`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect((await a2.json()).data.created).toBe(0);
});
