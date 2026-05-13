# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> A-01: register with valid data → redirect to dashboard
- Location: e2e\auth.spec.ts:11:5

# Error details

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for getByLabel('Имя')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - link "Ф" [ref=e6] [cursor=pointer]:
        - /url: /
        - generic [ref=e7]: Ф
      - heading "ФинансыПро" [level=1] [ref=e8]
      - paragraph [ref=e9]: Создайте бесплатный аккаунт
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Имя
          - textbox "Иван Иванов" [ref=e14]
        - generic [ref=e15]:
          - generic [ref=e16]: Email
          - textbox "you@example.com" [ref=e17]
        - generic [ref=e18]:
          - generic [ref=e19]: Пароль
          - textbox "Минимум 8 символов" [ref=e20]
        - generic [ref=e21]:
          - generic [ref=e22]: Повторите пароль
          - textbox "••••••••" [ref=e23]
        - button "Создать аккаунт" [ref=e24] [cursor=pointer]
      - paragraph [ref=e25]:
        - text: Уже есть аккаунт?
        - link "Войти" [ref=e26] [cursor=pointer]:
          - /url: /login
    - paragraph [ref=e27]: Регистрируясь, вы соглашаетесь на хранение данных на вашем сервере.
  - generic [ref=e28]:
    - img [ref=e30]
    - button "Open Tanstack query devtools" [ref=e78] [cursor=pointer]:
      - img [ref=e79]
```

# Test source

```ts
  1  | import { type Page, type Locator, expect } from '@playwright/test';
  2  | 
  3  | /** Page Object: страницы входа и регистрации */
  4  | export class AuthPage {
  5  |   readonly page: Page;
  6  | 
  7  |   // Login
  8  |   readonly emailInput:    Locator;
  9  |   readonly passwordInput: Locator;
  10 |   readonly loginButton:   Locator;
  11 |   readonly serverError:   Locator;
  12 | 
  13 |   // Register (дополнительные поля)
  14 |   readonly fullNameInput:       Locator;
  15 |   readonly confirmPasswordInput: Locator;
  16 |   readonly registerButton:      Locator;
  17 |   readonly registerLink:        Locator;
  18 |   readonly loginLink:           Locator;
  19 | 
  20 |   constructor(page: Page) {
  21 |     this.page = page;
  22 | 
  23 |     this.emailInput    = page.getByLabel('Email');
  24 |     this.passwordInput = page.getByLabel('Пароль').first();
  25 |     this.loginButton   = page.getByRole('button', { name: /войти/i });
  26 |     this.serverError   = page.locator('.bg-red-50, .bg-red-900\\/20').first();
  27 | 
  28 |     this.fullNameInput        = page.getByLabel('Имя');
  29 |     this.confirmPasswordInput = page.getByLabel('Повторите пароль');
  30 |     this.registerButton       = page.getByRole('button', { name: /создать аккаунт/i });
  31 |     this.registerLink         = page.getByRole('link', { name: /зарегистрироваться/i });
  32 |     this.loginLink            = page.getByRole('link', { name: /войти/i });
  33 |   }
  34 | 
  35 |   async gotoLogin() {
  36 |     await this.page.goto('/login');
  37 |     await expect(this.loginButton).toBeVisible();
  38 |   }
  39 | 
  40 |   async gotoRegister() {
  41 |     await this.page.goto('/register');
  42 |     await expect(this.registerButton).toBeVisible();
  43 |   }
  44 | 
  45 |   async login(email: string, password: string) {
  46 |     await this.emailInput.fill(email);
  47 |     await this.passwordInput.fill(password);
  48 |     await this.loginButton.click();
  49 |   }
  50 | 
  51 |   async register(fullName: string, email: string, password: string) {
> 52 |     await this.fullNameInput.fill(fullName);
     |                              ^ TimeoutError: locator.fill: Timeout 10000ms exceeded.
  53 |     await this.emailInput.fill(email);
  54 |     await this.passwordInput.fill(password);
  55 |     await this.confirmPasswordInput.fill(password);
  56 |     await this.registerButton.click();
  57 |   }
  58 | 
  59 |   async expectServerError(text: string | RegExp) {
  60 |     await expect(this.serverError).toBeVisible();
  61 |     await expect(this.serverError).toContainText(text);
  62 |   }
  63 | 
  64 |   async expectFieldError(field: 'email' | 'password' | 'fullName' | 'confirmPassword', msg: string | RegExp) {
  65 |     // Ошибки поля идут следующим элементом после инпута
  66 |     const input = {
  67 |       email: this.emailInput,
  68 |       password: this.passwordInput,
  69 |       fullName: this.fullNameInput,
  70 |       confirmPassword: this.confirmPasswordInput,
  71 |     }[field];
  72 |     const err = input.locator('~ p');
  73 |     await expect(err).toContainText(msg);
  74 |   }
  75 | }
  76 | 
```