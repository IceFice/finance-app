# QA Plan — ФинансыПро (Personal Finance App)

> **Стек:** Node.js 20 / Express 5 / PostgreSQL 16 (RLS) / Redis 7 / React 18 / Vite  
> **Инструменты:** Vitest (unit/integration), Playwright (E2E), Supertest (API)  
> **Покрытие-цель:** lines ≥ 80 %, branches ≥ 75 %

---

## Пирамида тестирования

```
         ┌──────────┐
         │   E2E    │  ~30 сценариев · Playwright
         │ Playwright│  полный браузер, реальный API
         ├──────────┤
         │Integration│  ~50 тестов · Supertest + тестовая БД
         │  (API)   │  каждый эндпоинт, статус коды, тело ответа
         ├──────────┤
         │   Unit   │  ~80 тестов · Vitest
         │  (logic) │  чистые функции: курсоры, расчёты, форматы
         └──────────┘
```

---

## 1. Транзакции — CRUD

| # | Сценарий | Тип | Ожидаемый результат |
|---|----------|-----|---------------------|
| T-01 | Создать доход | Integration | 201, `type=income`, баланс счёта увеличился |
| T-02 | Создать расход | Integration | 201, `type=expense`, баланс уменьшился |
| T-03 | Создать перевод | Integration | 201, 2 записи в БД, `transfer_pair_id` совпадает |
| T-04 | Перевод атомарный: ошибка на 2-й транзакции | Integration | 400, 0 записей сохранено (rollback) |
| T-05 | Редактировать сумму | Integration | 200, сумма обновлена, баланс пересчитан |
| T-06 | Редактировать категорию | Integration | 200, `category_id` обновлён |
| T-07 | Мягкое удаление | Integration | 200, `deleted_at` заполнен, GET-список не возвращает запись |
| T-08 | Удалить перевод → удаляются оба | Integration | 200, обе транзакции с `deleted_at` |
| T-09 | Удалить чужую транзакцию | Integration | 404 (RLS изоляция) |
| T-10 | Фильтр по дате (from/to) | Integration | Только транзакции в диапазоне |
| T-11 | Фильтр по счёту | Integration | Только транзакции указанного счёта |
| T-12 | Фильтр по категории | Integration | Только нужная категория |
| T-13 | Поиск по описанию | Integration | Частичное совпадение, case-insensitive |
| T-14 | Курсорная пагинация: первая страница | Integration | `hasMore=true`, `nextCursor` не null |
| T-15 | Курсорная пагинация: следующая страница | Integration | Данные не дублируются, порядок верный |
| T-16 | Курсорная пагинация: последняя страница | Integration | `hasMore=false`, `nextCursor=null` |
| T-17 | Пагинация: пустой результат | Integration | `data=[]`, `hasMore=false` |
| T-18 | Сумма с 4+ знаками после запятой | Integration | Округляется до 2, строка в JSON |
| T-19 | Сумма = 0 | Integration | 400 Validation error |
| T-20 | Отрицательная сумма | Integration | 400 Validation error |
| T-21 | Очень большая сумма (> NUMERIC(15,2)) | Integration | 400 или корректная обрезка |
| T-22 | Дата в будущем | Integration | 201 (разрешено) |
| T-23 | Спецсимволы в описании (`<script>`, `"`, `'`) | Integration | 201, XSS-escaping при выводе |
| T-24 | Описание 10 000 символов | Integration | 400 (превышен лимит) |
| T-25 | E2E: создать транзакцию через UI | E2E | Появляется в списке, сумма отображается верно |
| T-26 | E2E: редактировать транзакцию через UI | E2E | Изменения сохранены, показываются актуальные данные |
| T-27 | E2E: удалить транзакцию, подтвердить | E2E | Транзакция исчезла из списка |
| T-28 | E2E: бесконечный скролл | E2E | Подгружается следующая страница при прокрутке вниз |

---

## 2. Бюджеты и прогресс

| # | Сценарий | Тип | Ожидаемый результат |
|---|----------|-----|---------------------|
| B-01 | Создать бюджет с лимитом | Integration | 201, `spent="0.00"`, `percentage=0` |
| B-02 | Добавить транзакцию → прогресс обновился | Integration | GET /budgets/progress: spent увеличился |
| B-03 | Прогресс 0% (нет транзакций) | Integration | `percentage=0`, `status="ok"` |
| B-04 | Прогресс 50% | Integration | `percentage=50`, `status="ok"` |
| B-05 | Прогресс 80% (граница warning) | Integration | `percentage=80`, `status="warning"` |
| B-06 | Прогресс 100% (достигнут лимит) | Integration | `percentage=100`, `status="exceeded"` |
| B-07 | Прогресс 150% (превышение) | Integration | `percentage=150`, `status="exceeded"` |
| B-08 | Расчёт: spent/limit точность | Unit | `calcSpentPercentage("150.00","200.00")` = 75.0 |
| B-09 | Расчёт: lim=0 не делит на 0 | Unit | `calcSpentPercentage("50.00","0.00")` = 0 |
| B-10 | Projected spend: середина месяца | Unit | Верная экстраполяция на 31 день |
| B-11 | Два бюджета одного периода разных категорий | Integration | Каждый считает только свою категорию |
| B-12 | Бюджет другого пользователя не виден | Integration | 404 |
| B-13 | Граница периода: первый день месяца | Integration | Транзакция в этот день попадает в бюджет |
| B-14 | Граница периода: последний день месяца | Integration | Транзакция в этот день попадает в бюджет |
| B-15 | Удалить транзакцию → прогресс уменьшился | Integration | spent откатился |
| B-16 | Переводы не учитываются в бюджете | Integration | transfer транзакция не влияет на spent |
| B-17 | E2E: прогресс-бар зелёный при < 80% | E2E | Цвет соответствует статусу |
| B-18 | E2E: прогресс-бар красный при > 100% | E2E | Цвет и текст "Превышен" |

---

## 3. Отчёты и расчёты

| # | Сценарий | Тип | Ожидаемый результат |
|---|----------|-----|---------------------|
| R-01 | Monthly summary: сумма доходов | Integration | Совпадает с суммой income-транзакций |
| R-02 | Monthly summary: сумма расходов | Integration | Совпадает с суммой expense-транзакций |
| R-03 | Monthly summary: net = income - expenses | Unit | `sumMonthlyTotals` верен |
| R-04 | Monthly summary: переводы исключены | Integration | transfer не входит в income/expenses |
| R-05 | Пустой период (нет транзакций) | Integration | `income="0.00"`, `expenses="0.00"`, `net="0.00"` — не ошибка |
| R-06 | Spending by category: суммы по категориям | Integration | Каждая категория — верная сумма |
| R-07 | Spending by category: сумма % = 100 | Unit | `calcCategoryPct` в сумме даёт ~100% |
| R-08 | Spending by category: grandTotal = 0 | Unit | Нет деления на 0, возвращает "0.0" |
| R-09 | Cash flow: гранулярность month | Integration | 12 точек для годового диапазона |
| R-10 | Cash flow: гранулярность week | Integration | ~52 точки для годового диапазона |
| R-11 | Отчёт только своих данных (изоляция) | Integration | Данные другого пользователя не появляются |
| R-12 | Фильтр по дате работает | Integration | Только транзакции в диапазоне |
| R-13 | Мультивалюта: amount_base в base currency | Integration | amount * exchange_rate = amount_base |
| R-14 | E2E: вкладка "По категориям" — диаграмма | E2E | Donut chart отображается, легенда верна |
| R-15 | E2E: смена диапазона дат → данные обновились | E2E | Запрос отправлен, данные перерисованы |

---

## 4. Аутентификация

| # | Сценарий | Тип | Ожидаемый результат |
|---|----------|-----|---------------------|
| A-01 | Регистрация: валидные данные | Integration | 201, `accessToken` в теле, `refreshToken` в cookie HttpOnly |
| A-02 | Регистрация: дублирующий email | Integration | 409 Conflict |
| A-03 | Регистрация: слабый пароль (< 8 симв.) | Integration | 400 Validation |
| A-04 | Регистрация: невалидный email | Integration | 400 Validation |
| A-05 | Логин: верные данные | Integration | 200, accessToken, cookie с refreshToken |
| A-06 | Логин: неверный пароль | Integration | 401 (тот же ответ, что несуществующий пользователь) |
| A-07 | Логин: несуществующий email | Integration | 401 (timing-safe, одинаковое время) |
| A-08 | Блокировка после 5 попыток | Integration | 6-я попытка → 401 + lockout на 15 мин |
| A-09 | Разблокировка после 15 мин | Integration | Успешный вход после окончания lockout |
| A-10 | Refresh: валидный cookie | Integration | 200, новый accessToken, новый refreshToken в cookie |
| A-11 | Refresh: старый токен отозван (rotation) | Integration | Повторный запрос со старым refresh → 401 |
| A-12 | Refresh: replay-атака | Integration | Второй запрос с тем же токеном → 401 |
| A-13 | Refresh: истёкший токен | Integration | 401 |
| A-14 | Refresh: без cookie | Integration | 401 |
| A-15 | Logout: cookie очищен | Integration | Set-Cookie с `Max-Age=0` |
| A-16 | Logout: токен отозван в БД | Integration | refresh_tokens.revoked_at заполнен |
| A-17 | Доступ без токена к /accounts | Integration | 401 |
| A-18 | Доступ с истёкшим access token | Integration | 401 |
| A-19 | Доступ с подделанным access token | Integration | 401 |
| A-20 | E2E: полный flow регистрация → дашборд | E2E | Редирект на /dashboard, имя пользователя отображается |
| A-21 | E2E: логин → logout → редирект на /login | E2E | Сессия очищена |
| A-22 | E2E: истёкший access token → авто-refresh | E2E | Запрос прозрачно повторён с новым токеном |
| A-23 | E2E: refresh недоступен → редирект /login | E2E | Пользователь выброшен из приложения |

---

## 5. Безопасность и edge-cases

| # | Сценарий | Тип | Ожидаемый результат |
|---|----------|-----|---------------------|
| S-01 | SQL-инъекция в `search` параметре | Integration | 200/400, нет утечки данных из БД |
| S-02 | XSS в description поле | Integration | Данные сохранены как строка, не исполняются |
| S-03 | Пользователь A читает транзакции B | Integration | 404 (RLS) |
| S-04 | Пользователь A изменяет транзакцию B | Integration | 404 (RLS) |
| S-05 | Пользователь A удаляет счёт B | Integration | 404 (RLS) |
| S-06 | Rate limit: 6-й запрос /auth/login | Integration | 429 Too Many Requests |
| S-07 | Rate limit: headers X-RateLimit-* | Integration | Заголовки присутствуют |
| S-08 | CORS: запрос с неразрешённого origin | Integration | 403/заблокировано |
| S-09 | Подделанный cursor (невалидный base64) | Integration | 400 Validation |
| S-10 | Подделанный cursor (валидный base64, чужой ID) | Integration | Пустой результат (RLS) |
| S-11 | Поле description = 10 001 символов | Integration | 400 Validation |
| S-12 | Новый пользователь (пустая БД) | Integration | /accounts → `[]`, /transactions → `[]`, no 500 |
| S-13 | Конкурентные запросы на удаление | Integration | Первый — 200, второй — 404 |
| S-14 | Заголовки безопасности (helmet) | Integration | CSP, X-Frame-Options, HSTS присутствуют |
| S-15 | Нет `password_hash` в ответе /auth/me | Integration | Поле отсутствует в теле ответа |

---

## Запуск тестов

```bash
# Unit-тесты (Vitest)
cd backend
npm test

# Integration-тесты (Supertest + тестовая БД)
TEST_DATABASE_URL=postgresql://... npm run test:integration

# E2E-тесты (Playwright)
cd ..
npx playwright test

# E2E с UI
npx playwright test --ui

# Отчёт покрытия
cd backend
npm run test:coverage
```

---

## Критерии готовности (Definition of Done)

- [ ] Unit: все pure functions покрыты ≥ 90 %
- [ ] Integration: каждый эндпоинт имеет минимум happy path + один error path
- [ ] E2E: все 4 основных flow (auth, transactions, budgets, reports) зелёные
- [ ] Security: S-01 — S-06 проходят
- [ ] CI: тесты запускаются в GitHub Actions на каждый PR
- [ ] Нет flaky-тестов (3 последовательных прогона без падений)
