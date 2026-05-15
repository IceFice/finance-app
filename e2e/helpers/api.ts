/**
 * Прямые API-вызовы для подготовки данных в тестах.
 * Используют accessToken, полученный при регистрации/логине.
 */

const BASE = 'http://localhost:4000/api/v1';

function headers(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Accounts ────────────────────────────────────────────────────────────────

export async function createAccount(token: string, opts?: {
  name?: string; type?: string; currency?: string; balance?: string;
}) {
  const res = await fetch(`${BASE}/accounts`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      name: opts?.name ?? 'Test Account',
      type: opts?.type ?? 'checking',
      currency: opts?.currency ?? 'RUB',
      balance: opts?.balance ?? '10000.00',
    }),
  });
  if (!res.ok) throw new Error(`createAccount: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(token: string) {
  const res = await fetch(`${BASE}/categories`, { headers: headers(token) });
  if (!res.ok) throw new Error(`getCategories: ${res.status}`);
  return (await res.json()).data as Array<{ id: string; name: string; type: string }>;
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(token: string, opts: {
  accountId: string;
  categoryId?: string;
  amount: string;
  type: 'income' | 'expense' | 'debit' | 'credit';
  date?: string;
  description?: string;
}) {
  // Backend accepts 'debit' | 'credit' | 'transfer'. Map legacy helper names.
  const backendType =
    opts.type === 'income' ? 'credit' :
    opts.type === 'expense' ? 'debit' :
    opts.type;

  const res = await fetch(`${BASE}/transactions`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      accountId: opts.accountId,
      categoryId: opts.categoryId ?? null,
      amount: opts.amount,
      type: backendType,
      currency: 'RUB',
      date: opts.date ?? new Date().toISOString().split('T')[0],
      description: opts.description ?? 'Test transaction',
    }),
  });
  if (!res.ok) throw new Error(`createTransaction: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

export async function createTransfer(token: string, opts: {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date?: string;
}) {
  const res = await fetch(`${BASE}/transactions/transfer`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      fromAccountId: opts.fromAccountId,
      toAccountId: opts.toAccountId,
      amount: opts.amount,
      currency: 'RUB',
      date: opts.date ?? new Date().toISOString().split('T')[0],
      description: 'Transfer',
    }),
  });
  if (!res.ok) throw new Error(`createTransfer: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export async function createBudget(token: string, opts: {
  categoryId?: string | null;
  name: string;
  amount: string;
  period?: string;
  startDate?: string;
}) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0];

  const res = await fetch(`${BASE}/budgets`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      categoryId: opts.categoryId ?? null,
      name: opts.name,
      amount: opts.amount,
      currency: 'RUB',
      period: opts.period ?? 'monthly',
      startDate: opts.startDate ?? firstOfMonth,
    }),
  });
  if (!res.ok) throw new Error(`createBudget: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}
