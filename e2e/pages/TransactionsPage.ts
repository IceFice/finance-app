import { type Page, type Locator, expect } from '@playwright/test';

/** Page Object: страница транзакций */
export class TransactionsPage {
  readonly page: Page;

  readonly addButton:         Locator;
  readonly transactionRows:   Locator;
  readonly searchInput:       Locator;
  readonly filterPanel:       Locator;
  readonly confirmDeleteBtn:  Locator;
  readonly slideOver:         Locator;
  readonly amountInput:       Locator;
  readonly descriptionInput:  Locator;
  readonly typeSelect:        Locator;
  readonly saveButton:        Locator;

  constructor(page: Page) {
    this.page = page;

    this.addButton        = page.getByRole('button', { name: /добавить|новая транзакция/i }).first();
    this.transactionRows  = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    this.searchInput      = page.getByPlaceholder(/поиск|search/i);
    this.filterPanel      = page.getByTestId('filter-panel');
    this.confirmDeleteBtn = page.getByRole('button', { name: /удалить|подтвердить/i }).last();
    this.slideOver        = page.getByRole('dialog');
    this.amountInput      = page.getByLabel(/сумма|amount/i);
    this.descriptionInput = page.getByLabel(/описание|description/i);
    this.typeSelect       = page.getByLabel(/тип|type/i);
    this.saveButton       = page.getByRole('button', { name: /сохранить|добавить/i }).last();
  }

  async goto() {
    await this.page.goto('/transactions');
    await expect(this.addButton).toBeVisible({ timeout: 8_000 });
  }

  async openAddForm() {
    await this.addButton.click();
    await expect(this.slideOver).toBeVisible();
  }

  async fillAndSaveTransaction(opts: {
    amount: string;
    description?: string;
    type?: 'income' | 'expense' | 'debit' | 'credit';
  }) {
    await this.amountInput.fill(opts.amount);
    if (opts.description) await this.descriptionInput.fill(opts.description);
    if (opts.type) {
      // UI select uses backend values ('debit'/'credit'/'transfer')
      const selectValue =
        opts.type === 'income' ? 'credit' :
        opts.type === 'expense' ? 'debit' :
        opts.type;
      await this.typeSelect.selectOption(selectValue);
    }
    await this.saveButton.click();
    await expect(this.slideOver).not.toBeVisible({ timeout: 5_000 });
  }

  async deleteFirstTransaction() {
    const firstRow = this.transactionRows.first();
    await firstRow.hover();
    await firstRow.getByRole('button', { name: /удалить/i }).click();
    await expect(this.confirmDeleteBtn).toBeVisible();
    await this.confirmDeleteBtn.click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(400); // debounce
  }

  async getRowCount(): Promise<number> {
    return this.transactionRows.count();
  }

  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(500);
  }
}
