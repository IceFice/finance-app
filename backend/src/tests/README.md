# Testing Guide

## Структура тестов

```
src/
├── lib/
│   └── __tests__/
│       ├── cursor.test.ts      # Unit: encodeCursor / decodeCursor
│       └── errors.test.ts      # Unit: AppError hierarchy
├── modules/
│   ├── budgets/
│   │   ├── budgets.math.ts     # Pure business logic (extracted for testability)
│   │   └── __tests__/
│   │       └── budgets.math.test.ts  # Unit: budget calculations
│   └── reports/
│       ├── reports.math.ts     # Pure aggregation helpers
│       └── __tests__/
│           └── reports.math.test.ts  # Unit: aggregation logic
└── tests/
    ├── setup.unit.ts           # Env stubs for unit tests
    ├── setup.integration.ts    # Env + DB setup for integration tests
    ├── helpers/
    │   └── db.ts               # createTestUser, createTestAccount, etc.
    └── integration/
        ├── auth.test.ts        # POST /auth/login, /refresh, /logout
        ├── transactions.test.ts # GET/POST /transactions, transfer, soft-delete
        ├── budgets.test.ts     # GET/POST /budgets, progress calculation
        └── reports.test.ts     # Monthly summary, spending by category
```

## Запуск тестов

### Юнит-тесты (без БД)
```bash
cd backend
npm test
```

### С покрытием
```bash
npm run test:coverage
# Открыть coverage/index.html для HTML-отчёта
```

### Интеграционные тесты (требуют PostgreSQL)
```bash
# 1. Создать тестовую БД
createdb finance_test

# 2. Запустить миграции на тестовой БД
DATABASE_URL=postgresql://finance_user:password@localhost:5432/finance_test npm run migrate

# 3. Запустить интеграционные тесты
TEST_DATABASE_URL=postgresql://finance_user:password@localhost:5432/finance_test npm run test:integration
```

### Watch-режим (разработка)
```bash
npm run test:watch
```

## Пирамида тестов

```
        ┌────────────────────────────┐
        │   Integration Tests (30%)  │  ← Реальная БД + supertest
        ├────────────────────────────┤
        │    Unit Tests (70%)        │  ← Чистые функции, без БД
        └────────────────────────────┘
```

## Принципы изоляции

- **Unit-тесты:** не обращаются к БД, не делают HTTP. Тестируют чистые функции из `*.math.ts`.
- **Интеграционные тесты:** каждый `describe`-блок создаёт собственного пользователя и удаляет его в `afterAll` через `deleteTestUser(userId)`. Это каскадно удаляет все связанные данные.

## Целевое покрытие

| Модуль | Цель |
|--------|------|
| `lib/cursor.ts` | 100% |
| `lib/errors.ts` | 100% |
| `modules/budgets/budgets.math.ts` | 100% |
| `modules/reports/reports.math.ts` | 100% |
| `modules/*/service.ts` | ≥ 80% (через интеграционные тесты) |

## TDD-цикл для новой фичи

```
1. RED   → Написать падающий тест (в __tests__/ или tests/integration/)
2. GREEN → Минимальная реализация в src/modules/
3. REFACTOR → Упростить, не ломая тесты
```
