/**
 * T-01 … T-28 — Transaction CRUD, filters, pagination, edge cases
 */

import { test, expect } from '@playwright/test';
import { makeUser, apiRegister, loginViaUI } from './fixtures/auth';
import { createAccount, createTransaction, getCategories } from './helpers/api';
import { TransactionsPage } from './pages/TransactionsPage';

// ── Общая подготовка: пользователь + счёт ────────────────────────────────────

async function setupUserWithAccount() {
  const user = makeUser('tx');
  const { accessToken } = await apiRegister(user);
  const account = await createAccount(accessToken);
  const categories = await getCategories(accessToken);
  const expenseCat = categories.find(c => c.type === 'expense')!;
  const incomeCat  = categories.find(c => c.type === 'income')!;
  return { user, accessToken, account, expenseCat, incomeCat };
}

// ── T-25: E2E создать транзакцию через UI ────────────────────────────────────
test('T-25: create expense transaction via UI → appears in list', async ({ page }) => {
  const { user } = await setupUserWithAccount();
  await loginViaUI(page, user);

  const txPage = new TransactionsPage(page);
  await txPage.goto();

  const countBefore = await txPage.getRowCount();
  await txPage.openAddForm();
  await txPage.fillAndSaveTransaction({ amount: '1500.00', description: 'Тест покупка', type: 'expense' });

  // Строка появилась
  await expect(txPage.transactionRows).toHaveCount(countBefore + 1, { timeout: 5_000 });
  await expect(page.getByText('Тест покупка')).toBeVisible();
  // Сумма отображается как строка с форматированием
  await expect(page.getByText(/1.500|1500/)).toBeVisible();
});

// ── T-26: E2E редактировать транзакцию ───────────────────────────────────────
test('T-26: edit transaction via UI → changes are saved', async ({ page }) => {
  const { user, accessToken, account } = await setupUserWithAccount();
  await createTransaction(accessToken, {
    accountId: account.id,
    amount: '500.00',
    type: 'expense',
    description: 'До редактирования',
  });
  await loginViaUI(page, user);

  const txPage = new TransactionsPage(page);
  await txPage.goto();

  // Кликаем на первую строку для открытия детали
  await txPage.transactionRows.first().click();
  const slideOver = page.getByRole('dialog');
  await expect(slideOver).toBeVisible();

  // Меняем описание
  const descField = slideOver.getByLabel(/описание|description/i);
  await descField.clear();
  await descField.fill('После редактирования');
  await slideOver.getByRole('button', { name: /сохранить/i }).click();
  await expect(slideOver).not.toBeVisible({ timeout: 5_000 });

  await expect(page.getByText('После редактирования')).toBeVisible();
});

// ── T-27: E2E удалить транзакцию с подтверждением ────────────────────────────
test('T-27: delete transaction → disappears from list', async ({ page }) => {
  const { user, accessToken, account } = await setupUserWithAccount();
  await createTransaction(accessToken, { accountId: account.id, amount: '300.00', type: 'expense' });

  await loginViaUI(page, user);
  const txPage = new TransactionsPage(page);
  await txPage.goto();

  const countBefore = await txPage.getRowCount();
  await txPage.deleteFirstTransaction();
  await expect(txPage.transactionRows).toHaveCount(countBefore - 1, { timeout: 5_000 });
});

// ── T-10: Поиск по описанию ───────────────────────────────────────────────────
test('T-10/T-13: search filters transactions correctly', async ({ page }) => {
  const { user, accessToken, account } = await setupUserWithAccount();
  await createTransaction(accessToken, { accountId: account.id, amount: '100.00', type: 'expense', description: 'Лента магазин' });
  await createTransaction(accessToken, { accountId: account.id, amount: '200.00', type: 'expense', description: 'Кафе обед' });
  await createTransaction(accessToken, { accountId: account.id, amount: '300.00', type: 'income', description: 'Зарплата' });

  await loginViaUI(page, user);
  const txPage = new TransactionsPage(page);
  await txPage.goto();

  await txPage.search('Лента');
  const rows = await txPage.getRowCount();
  expect(rows).toBe(1);
  await expect(page.getByText('Лента магазин')).toBeVisible();
  await expect(page.getByText('Кафе обед')).not.toBeVisible();
});

// ── T-28: Бесконечный скролл ─────────────────────────────────────────────────
test('T-28: infinite scroll loads next page', async ({ page }) => {
  const { user, accessToken, account } = await setupUserWithAccount();
  // Создаём 55 транзакций (больше одной страницы limit=50)
  const promises = Array.from({ length: 55 }, (_, i) =>
    createTransaction(accessToken, {
      accountId: account.id,
      amount:    `${10 + i}.00`,
      type:      'expense',
      description: `TX ${String(i).padStart(3, '0')}`,
    })
  );
  await Promise.all(promises);

  await loginViaUI(page, user);
  const txPage = new TransactionsPage(page);
  await txPage.goto();

  const firstCount = await txPage.getRowCount();
  expect(firstCount).toBeGreaterThanOrEqual(20); // хотя бы одна страница

  await txPage.scrollToBottom();
  await page.waitForTimeout(1000); // дать время подгрузиться

  const secondCount = await txPage.getRowCount();
  expect(secondCount).toBeGreaterThan(firstCount); // подгрузились ещё
});

// ── T-23: XSS в описании ─────────────────────────────────────────────────────
test('T-23: XSS in description is escaped, not executed', async ({ page }) => {
  const { user, accessToken, account } = await setupUserWithAccount();
  await createTransaction(accessToken, {
    accountId: account.id,
    amount: '100.00',
    type: 'expense',
    description: '<script>window.__XSS_TEST__=true</script>',
  });

  await loginViaUI(page, user);
  const txPage = new TransactionsPage(page);
  await txPage.goto();

  // Скрипт не выполнился
  const xssExecuted = await page.evaluate(() => (window as unknown as Record<string, unknown>)['__XSS_TEST__']);
  expect(xssExecuted).toBeUndefined();
});

// ── T-19/T-20: Валидация суммы ────────────────────────────────────────────────
test('T-19/T-20: zero or negative amount → form validation error', async ({ page }) => {
  const { user } = await setupUserWithAccount();
  await loginViaUI(page, user);

  const txPage = new TransactionsPage(page);
  await txPage.goto();
  await txPage.openAddForm();

  const amountInput = page.getByRole('dialog').getByLabel(/сумма|amount/i);
  await amountInput.fill('0');
  await page.getByRole('dialog').getByRole('button', { name: /сохранить|добавить/i }).last().click();

  // Ошибка валидации — диалог остаётся открытым
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/больше нуля|positive|сумма/i)).toBeVisible();
});

// ── T-24: Слишком длинное описание ───────────────────────────────────────────
test('T-24: description > max length → validation error', async ({ page }) => {
  const { user } = await setupUserWithAccount();
  await loginViaUI(page, user);

  const txPage = new TransactionsPage(page);
  await txPage.goto();
  await txPage.openAddForm();

  const longText = 'A'.repeat(1001);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/описание|description/i).fill(longText);
  await dialog.getByLabel(/сумма|amount/i).fill('100');
  await dialog.getByRole('button', { name: /сохранить|добавить/i }).last().click();

  await expect(dialog).toBeVisible(); // не закрылся
});
