import { type Page, type Locator, expect } from '@playwright/test';

/** Page Object: страницы входа и регистрации */
export class AuthPage {
  readonly page: Page;

  // Login
  readonly emailInput:    Locator;
  readonly passwordInput: Locator;
  readonly loginButton:   Locator;
  readonly serverError:   Locator;

  // Register (дополнительные поля)
  readonly fullNameInput:       Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton:      Locator;
  readonly registerLink:        Locator;
  readonly loginLink:           Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Пароль').first();
    this.loginButton   = page.getByRole('button', { name: /войти/i });
    this.serverError   = page.locator('.bg-red-50, .bg-red-900\\/20').first();

    this.fullNameInput        = page.getByLabel('Имя');
    this.confirmPasswordInput = page.getByLabel('Повторите пароль');
    this.registerButton       = page.getByRole('button', { name: /создать аккаунт/i });
    this.registerLink         = page.getByRole('link', { name: /зарегистрироваться/i });
    this.loginLink            = page.getByRole('link', { name: /войти/i });
  }

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.loginButton).toBeVisible();
  }

  async gotoRegister() {
    await this.page.goto('/register');
    await expect(this.registerButton).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async register(fullName: string, email: string, password: string) {
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.registerButton.click();
  }

  async expectServerError(text: string | RegExp) {
    await expect(this.serverError).toBeVisible();
    await expect(this.serverError).toContainText(text);
  }

  async expectFieldError(field: 'email' | 'password' | 'fullName' | 'confirmPassword', msg: string | RegExp) {
    // Ошибки поля идут следующим элементом после инпута
    const input = {
      email: this.emailInput,
      password: this.passwordInput,
      fullName: this.fullNameInput,
      confirmPassword: this.confirmPasswordInput,
    }[field];
    const err = input.locator('~ p');
    await expect(err).toContainText(msg);
  }
}
