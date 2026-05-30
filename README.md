# Бабкосчёт — личные финансы

Веб-приложение для учёта личных финансов: счета, операции, бюджеты, цели
накопления, регулярные платежи и отчёты. Multi-account, мультивалютность,
импорт/экспорт CSV.

**Прод:** [babkoschet.ru](https://babkoschet.ru) · **API-доки:** `/api/v1/docs` (Swagger UI)

---

## Стек

| Слой | Технологии |
|------|-----------|
| **Backend** | Node 20 · Express 5 · TypeScript · PostgreSQL 16 (RLS) · Redis 7 · Zod · jsonwebtoken · bcryptjs |
| **Frontend** | React 18 · Vite 5 · TypeScript · TanStack Query v5 · Zustand · Tailwind 3 · Recharts · React Hook Form + Zod |
| **Тесты** | Vitest (unit) · Supertest (integration) · Playwright (E2E) |
| **Инфра** | Docker Compose · GitHub Actions (CI + Security Gates + Deploy) · nginx |

---

## Быстрый старт (локально)

Нужен Docker + Node 20.

```bash
# 1. Поднять Postgres + Redis
docker compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env          # отредактируйте секреты
npm install
npm run migrate               # применить миграции
npm run dev                   # http://localhost:4000

# 3. Frontend (в новом терминале)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Откройте http://localhost:5173, зарегистрируйтесь — и вперёд.

---

## Структура

```
backend/          Express API (модульный монолит)
  src/modules/    auth · accounts · transactions · categories
                  budgets · reports · goals · recurring
  src/middleware/ authenticate · rateLimiter · errorHandler
  src/db/         pool · context (RLS-обёртка)
  openapi/        OpenAPI 3.1 спека → /api/v1/docs
frontend/         React SPA
  src/pages/      Dashboard · Accounts · Transactions · Budgets
                  Reports · Goals · Recurring · Categories · Settings · Import
  src/hooks/      TanStack Query хуки
migrations/       SQL-миграции (001…012), идемпотентный runner
e2e/              Playwright-сценарии (~200 тестов)
deploy/           server-setup · backup · nginx · runbook
```

---

## Команды

```bash
# Backend
npm run dev            # dev-сервер (tsx watch)
npm run build          # компиляция в dist/
npm test               # unit (Vitest)
npm run test:integration
npm run migrate        # применить миграции

# Frontend
npm run dev
npm run build
npm test               # Vitest + Testing Library

# Из корня
npm run lint           # ESLint (backend + frontend)
npm run typecheck
npx playwright test    # E2E
```

---

## Ключевые архитектурные решения

- **Деньги — строки** (`"1500.00"`), никогда не float. Дефолтная валюта `RUB`.
- **PostgreSQL RLS**: каждый запрос исполняется под ролью `app_user` с
  `app.current_user_id`; чужие данные физически невидимы (`FORCE ROW LEVEL
  SECURITY` + `WITH CHECK`).
- **Auth**: access-JWT (15 мин, в памяти) + refresh в HttpOnly-cookie (30 дней,
  хэшируется в БД). Ротация refresh-токенов с обнаружением повторного
  использования (theft detection), список сессий, lockout после 5 попыток.
- **Cursor-пагинация** операций (base64 `{date,id}`), не OFFSET.
- **Курс-генератор** регулярных платежей — in-process scheduler раз в час.

---

## Документация

- [`QA_PLAN.md`](QA_PLAN.md) — план тестирования (~95 сценариев)
- [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) — чеклист перед деплоем
- [`deploy/README.md`](deploy/README.md) — раннбук прод-сервера
- `/api/v1/docs` — интерактивная OpenAPI-спека (Swagger UI)

---

## CI/CD

Три workflow в GitHub Actions:

- **CI Pipeline** — lint · unit · integration · E2E · docker-build (matrix)
- **Security Gates** — gitleaks · npm audit · ESLint Security · OWASP
  Dependency-Check · SBOM
- **Deploy · Production** — за approval-gate, SSH rolling update, миграции,
  health-check

---

## Лицензия

Личный проект. Код открыт.
