// ════════════════════════════════════════════════════════════════════════════
// Бабкосчёт — Dashboard v3
// Visual language: v1 (soft mint cards, dark sidebar, SVG icons, sparklines)
// Data model & features: real codebase (IceFice/finance-app)
//   Accounts strip      → useAccounts()           → /accounts
//   Transactions table  → useTransactions()       → /transactions  (credit/debit, merchant, description)
//   Budgets panel       → useBudgets()            → /budgets       (with stoplight progress)
//   Summary cards       → useReportsMonthlySummary → /reports/monthly-summary
//   Donut               → useReportsSpendingByCategory → /reports/spending-by-category
// ════════════════════════════════════════════════════════════════════════════

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6366F1",
  "cardStyle": "soft",
  "showSpark": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B"];
const INCOME = "#22C55E";
const EXPENSE = "#EF4444";
const SIDEBAR = "#1E2235";

// ────────────────────────────────────────────────────────────────────────────
// MOCK DATA — shaped exactly like the real API responses.
// ────────────────────────────────────────────────────────────────────────────

// Nav mirrors AppLayout.tsx (Главная / Операции / Бюджеты / Отчёты)
const NAV = [
  { to: "Dashboard v3.html", label: "Главная",   icon: IconHome,    active: true },
  { to: "Operations.html",   label: "Операции",  icon: IconList },
  { to: "Budgets.html",      label: "Бюджеты",   icon: IconTarget },
  { to: "Reports.html",      label: "Отчёты",    icon: IconChart },
];

// → useAccounts(): Account[]
const ACCOUNTS = [
  { id: "a1", name: "Тинькофф Black",   type: "card",    currency: "RUB", balance: "184500.00", color: "#1E2235", icon: "💳", isActive: true },
  { id: "a2", name: "Сбер Дебет",       type: "card",    currency: "RUB", balance:  "62300.00", color: "#22C55E", icon: "💳", isActive: true },
  { id: "a3", name: "Наличные",         type: "cash",    currency: "RUB", balance:  "12650.00", color: "#F59E0B", icon: "💵", isActive: true },
  { id: "a4", name: "Копилка",          type: "savings", currency: "RUB", balance:  "62660.00", color: "#6366F1", icon: "🐷", isActive: true },
  { id: "a5", name: "PayPal",           type: "wallet",  currency: "USD", balance:    "340.20", color: "#0EA5E9", icon: "💳", isActive: true },
];

// → useTransactions({from,to}): { pages: [{ data: Transaction[] }] }
// Transaction shape: id, accountId, categoryId, amount, currency,
// type ('credit' | 'debit'), description, merchant, date (ISO),
// categoryName, categoryColor, accountName
const TRANSACTIONS = [
  { id: "t1", accountId: "a2", categoryId: "c1", amount: "2480.00",   currency: "RUB", type: "debit",
    merchant: "Перекрёсток",   description: "Продукты на неделю",  date: "2026-05-18",
    categoryName: "Продукты",         categoryColor: "#F59E0B", accountName: "Сбер Дебет" },
  { id: "t2", accountId: "a1", categoryId: "c2", amount: "120000.00", currency: "RUB", type: "credit",
    merchant: "ООО Контур",    description: "Зарплата за май",     date: "2026-05-17",
    categoryName: "Зарплата",         categoryColor: "#22C55E", accountName: "Тинькофф Black" },
  { id: "t3", accountId: "a2", categoryId: "c3", amount: "890.00",    currency: "RUB", type: "debit",
    merchant: "Surf Coffee",   description: "Капучино + круассан", date: "2026-05-16",
    categoryName: "Кафе и рестораны", categoryColor: "#EC4899", accountName: "Сбер Дебет" },
  { id: "t4", accountId: "a1", categoryId: "c4", amount: "1240.00",   currency: "RUB", type: "debit",
    merchant: "Yandex Go",     description: "Метро + такси",       date: "2026-05-15",
    categoryName: "Транспорт",        categoryColor: "#0EA5E9", accountName: "Тинькофф Black" },
  { id: "t5", accountId: "a1", categoryId: "c5", amount: "1800.00",   currency: "RUB", type: "debit",
    merchant: "Каро Фильм",    description: "Кинотеатр, 2 билета", date: "2026-05-14",
    categoryName: "Развлечения",      categoryColor: "#A855F7", accountName: "Тинькофф Black" },
  { id: "t6", accountId: "a5", categoryId: "c6", amount: "320.00",    currency: "USD", type: "credit",
    merchant: "Upwork",        description: "Дизайн логотипа",     date: "2026-05-13",
    categoryName: "Фриланс",          categoryColor: "#10B981", accountName: "PayPal" },
  { id: "t7", accountId: "a1", categoryId: "c7", amount: "45000.00",  currency: "RUB", type: "debit",
    merchant: "Иванов И.И.",   description: "Аренда квартиры",     date: "2026-05-12",
    categoryName: "Аренда",           categoryColor: "#6366F1", accountName: "Тинькофф Black" },
  { id: "t8", accountId: "a2", categoryId: "c8", amount: "4320.00",   currency: "RUB", type: "debit",
    merchant: "Ozon",          description: "Кроссовки",           date: "2026-05-11",
    categoryName: "Покупки",          categoryColor: "#14B8A6", accountName: "Сбер Дебет" },
];

// → useBudgets(): Budget[] — name, amount, spent (strings), categoryColor
const BUDGETS = [
  { id: "b1", name: "Продукты",          categoryName: "Продукты",         categoryColor: "#F59E0B", amount: "20000.00", spent: "12480.00", currency: "RUB", period: "month" },
  { id: "b2", name: "Кафе",              categoryName: "Кафе и рестораны", categoryColor: "#EC4899", amount: "10000.00", spent:  "8890.00", currency: "RUB", period: "month" },
  { id: "b3", name: "Транспорт",         categoryName: "Транспорт",        categoryColor: "#0EA5E9", amount:  "8000.00", spent:  "6240.00", currency: "RUB", period: "month" },
  { id: "b4", name: "Развлечения",       categoryName: "Развлечения",      categoryColor: "#A855F7", amount:  "5000.00", spent:  "5800.00", currency: "RUB", period: "month" },
];

// → useReportsSpendingByCategory(): { categoryId, categoryName, categoryColor, total, percentage }
const SPENDING_BY_CATEGORY = [
  { categoryId: "c7", categoryName: "Аренда",           categoryColor: "#6366F1", total: "45000.00", percentage: "54.6" },
  { categoryId: "c1", categoryName: "Продукты",         categoryColor: "#F59E0B", total: "12480.00", percentage: "15.2" },
  { categoryId: "c3", categoryName: "Кафе и рестораны", categoryColor: "#EC4899", total:  "8890.00", percentage: "10.8" },
  { categoryId: "c4", categoryName: "Транспорт",        categoryColor: "#0EA5E9", total:  "6240.00", percentage:  "7.6" },
  { categoryId: "c5", categoryName: "Развлечения",      categoryColor: "#A855F7", total:  "5800.00", percentage:  "7.1" },
  { categoryId: "c8", categoryName: "Покупки",          categoryColor: "#14B8A6", total:  "3930.00", percentage:  "4.7" },
];

// → useReportsMonthlySummary(): MonthEntry[]
const MONTHLY_SUMMARY = [
  { month: "2026-05-01", income: "145000.00", expenses: "82340.00", net: "62660.00" },
];

// Goal for the savings card — UI-only data the real app would persist somewhere.
const SAVINGS_GOAL = 80000;

// ────────────────────────────────────────────────────────────────────────────
// Format helpers — match frontend/src/lib/utils.ts
// ────────────────────────────────────────────────────────────────────────────
const CUR_FRACTION = { RUB: 0, USD: 2, EUR: 2 };
function formatMoney(amount, currency = "RUB") {
  const raw = typeof amount === "string" ? Number(amount) : amount;
  const num = Number.isFinite(raw) ? raw : 0;
  const f = CUR_FRACTION[currency] ?? 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency", currency,
    minimumFractionDigits: f, maximumFractionDigits: f,
  }).format(num);
}
function sumMoney(values) {
  const cents = values.reduce((acc, v) => {
    const n = Number(v);
    return acc + (Number.isFinite(n) ? Math.round(n * 100) : 0);
  }, 0);
  return (cents / 100).toFixed(2);
}
const MONTHS_RU = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const MONTHS_RU_LONG = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}
// First grapheme of category name → avatar letter (e.g. "Кафе и рестораны" → "К")
function initialOf(name) {
  return (name || "?").trim().slice(0, 1).toUpperCase();
}

// ════════════════════════════════════════════════════════════════════════════
// Theming
// ════════════════════════════════════════════════════════════════════════════
function useTheme(t) {
  const dark = t.theme === "dark";
  return {
    dark,
    bg:        dark ? "#0F1117" : "#F4F2EC",
    surface:   dark ? "#181B26" : "#FFFFFF",
    surfaceAlt:dark ? "#1F2331" : "#FBFAF5",
    text:      dark ? "#E9EAF1" : "#171821",
    textDim:   dark ? "#9298AC" : "#6B7080",
    textMute:  dark ? "#5B6178" : "#9AA0B0",
    border:    dark ? "#262A3A" : "#E7E4DA",
    accent:    t.accent,
    income:    INCOME,
    expense:   EXPENSE,
    sidebar:   SIDEBAR,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// App
// ════════════════════════════════════════════════════════════════════════════
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const c = useTheme(t);

  // Month selector — May 2026
  const [month, setMonth] = React.useState({ y: 2026, m: 4 });
  const monthName = MONTHS_RU_LONG[month.m];
  const stepMonth = (d) => setMonth(({ y, m }) => {
    let nm = m + d, ny = y;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11){ nm = 0;  ny++; }
    return { y: ny, m: nm };
  });

  // ── Derive summary cards from MONTHLY_SUMMARY + ACCOUNTS, the same way
  //    Dashboard/index.tsx does it:
  //      totalBalance  = sumMoney(accounts.balance)
  //      totalIncome   = sumMoney(months.income)
  //      totalExpenses = sumMoney(months.expenses)
  //      totalNet      = totalIncome - totalExpenses (savings)
  const totalBalance  = Number(sumMoney(ACCOUNTS.filter(a => a.currency === "RUB").map(a => a.balance)));
  const totalIncome   = Number(sumMoney(MONTHLY_SUMMARY.map(m => m.income)));
  const totalExpenses = Number(sumMoney(MONTHLY_SUMMARY.map(m => m.expenses)));
  const totalNet      = totalIncome - totalExpenses;

  // Card styling
  const cardRadius = t.cardStyle === "outlined" ? 14 : 18;
  const cardBg = (tint) => {
    if (t.cardStyle === "outlined") return "transparent";
    if (t.cardStyle === "soft")     return tint ?? c.surface;
    return c.surface;
  };
  const cardBorder = t.cardStyle === "outlined" ? `1px solid ${c.border}` : "none";
  const cardShadow = t.cardStyle === "flat" || c.dark ? "none" : "0 1px 0 rgba(15,17,23,0.04), 0 8px 24px -16px rgba(15,17,23,0.08)";

  return (
    <div style={{
      minHeight: "100vh",
      background: c.bg,
      color: c.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex",
      letterSpacing: "-0.01em",
    }}>
      {/* ════════════ SIDEBAR ════════════ */}
      <aside style={{
        width: 244,
        flexShrink: 0,
        background: c.sidebar,
        color: "#E9EAF1",
        padding: "28px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        position: "sticky",
        top: 0,
        height: "100vh",
        boxSizing: "border-box",
      }}>
        <Logo accent={t.accent} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(n => <NavItem key={n.to} href={n.to} {...n} accent={t.accent} />)}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Mini savings/goal block (UI-only, matches v1) */}
          <SavingsMini accent={t.accent} value={totalNet} goal={SAVINGS_GOAL} />

          {/* Theme + logout — same role as AppLayout footer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SidebarBtn icon={t.theme === "dark" ? "☀️" : "🌙"}
              label={t.theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              onClick={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")} />
            <SidebarBtn icon="🚪" label="Выйти" danger />
          </div>
          <div style={{ padding: "0 8px", fontSize: 11, color: "#5B6178" }}>anna@babkoschet.ru</div>
        </div>
      </aside>

      {/* ════════════ MAIN ════════════ */}
      <main style={{ flex: 1, padding: "28px 36px 64px", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: "flex", alignItems: "center", gap: 24, marginBottom: 28,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: c.textDim, marginBottom: 4 }}>
              Привет, Аня 👋
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Главная
            </h1>
          </div>

          <div style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center",
            background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: 999, padding: 4, gap: 2,
          }}>
            <IconButton onClick={() => stepMonth(-1)} c={c}><Chevron dir="left" /></IconButton>
            <div style={{ padding: "0 14px", minWidth: 130, textAlign: "center", fontSize: 14, fontWeight: 500 }}>
              {monthName} {month.y}
            </div>
            <IconButton onClick={() => stepMonth(1)} c={c}><Chevron dir="right" /></IconButton>
          </div>

          <button style={{
            position: "relative", width: 40, height: 40, borderRadius: 12,
            background: c.surface, border: `1px solid ${c.border}`,
            color: c.text, cursor: "pointer",
            display: "grid", placeItems: "center",
          }}>
            <IconBell />
            <span style={{
              position: "absolute", top: 8, right: 9,
              width: 8, height: 8, borderRadius: "50%",
              background: t.accent, border: `2px solid ${c.surface}`,
            }} />
          </button>

          {/* "+ Добавить" — primary action from real Transactions page */}
          <button style={{
            background: t.accent, color: "#fff",
            border: "none", cursor: "pointer",
            padding: "0 18px", height: 40, borderRadius: 12,
            fontSize: 14, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 6px 16px -8px ${t.accent}`,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, marginTop: -2 }}>+</span>
            Добавить операцию
          </button>

          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "4px 12px 4px 4px",
            background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: 999,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${t.accent}, ${shade(t.accent, -20)})`,
              color: "#fff", display: "grid", placeItems: "center",
              fontSize: 13, fontWeight: 600,
            }}>АП</div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Аня</span>
          </div>
        </header>

        {/* ════════════ Row 1: 4 stat cards ════════════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18,
          marginBottom: 18,
        }}>
          <StatCard
            label="Баланс"  value={formatMoney(totalBalance)}  sub={`${ACCOUNTS.length} счетов`}
            tint={cardBg(c.dark ? "#1A2230" : "#EEF0FF")}
            radius={cardRadius} border={cardBorder} shadow={cardShadow}
            accent={t.accent} icon={<IconWallet />}
            showSpark={t.showSpark} sparkColor={t.accent}
            c={c}
          />
          <StatCard
            label="Доходы"  value={`+${formatMoney(totalIncome)}`}  sub="за месяц"
            tint={cardBg(c.dark ? "#142421" : "#E8F7EE")}
            radius={cardRadius} border={cardBorder} shadow={cardShadow}
            accent={INCOME} valueColor={INCOME} icon={<IconArrowDown />}
            showSpark={t.showSpark} sparkColor={INCOME}
            trend="+12% к апрелю" c={c}
          />
          <StatCard
            label="Расходы"  value={`−${formatMoney(totalExpenses)}`}  sub="за месяц"
            tint={cardBg(c.dark ? "#2A1A1F" : "#FDECEC")}
            radius={cardRadius} border={cardBorder} shadow={cardShadow}
            accent={EXPENSE} valueColor={EXPENSE} icon={<IconArrowUp />}
            showSpark={t.showSpark} sparkColor={EXPENSE}
            trend="−4% к апрелю" c={c}
          />
          <StatCard
            label="Сбережения"  value={`+${formatMoney(totalNet)}`}  sub={`цель ${formatMoney(SAVINGS_GOAL)}`}
            tint={cardBg(c.dark ? "#1B1B30" : "#EEEBFB")}
            radius={cardRadius} border={cardBorder} shadow={cardShadow}
            accent={t.accent} valueColor={t.accent} icon={<IconPig />}
            progress={totalNet / SAVINGS_GOAL} c={c}
          />
        </section>

        {/* ════════════ Row 2: Accounts strip ════════════ */}
        <Card c={c} radius={cardRadius} border={cardBorder} shadow={cardShadow} pad={0}
              style={{ marginBottom: 18 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 22px 12px",
          }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Счета
            </h2>
            <a href="#" style={{
              fontSize: 13, fontWeight: 500, color: t.accent, textDecoration: "none",
            }}>Управление счетами →</a>
          </div>
          <div style={{
            display: "flex", gap: 12, padding: "0 22px 22px",
            overflowX: "auto",
          }}>
            {ACCOUNTS.map(acc => <AccountCard key={acc.id} acc={acc} dark={c.dark} />)}
            <AddAccountCard accent={t.accent} c={c} />
          </div>
        </Card>

        {/* ════════════ Row 3: Transactions table | Donut ════════════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr 420px", gap: 18,
          alignItems: "start", marginBottom: 18,
        }}>
          {/* Transactions */}
          <Card c={c} radius={cardRadius} border={cardBorder} shadow={cardShadow} pad={0}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "20px 24px 16px",
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Последние операции
              </h2>
              <span style={{
                fontSize: 12, color: c.textDim,
                background: c.surfaceAlt,
                padding: "3px 10px", borderRadius: 999,
                border: `1px solid ${c.border}`,
              }}>{TRANSACTIONS.length}</span>
              <a href="/transactions" style={{
                marginLeft: "auto", fontSize: 13, fontWeight: 500,
                color: t.accent, textDecoration: "none",
              }}>Все операции →</a>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{
                  fontSize: 11, color: c.textMute,
                  textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500,
                }}>
                  <Th c={c} pl>Дата</Th>
                  <Th c={c}>Категория</Th>
                  <Th c={c}>Тип</Th>
                  <Th c={c} right>Сумма</Th>
                  <Th c={c} right pr>Действия</Th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((tx) => {
                  const isIn = tx.type === "credit";
                  return (
                    <tr key={tx.id} style={{ borderTop: `1px solid ${c.border}` }}>
                      <Td c={c} pl>
                        <div style={{ color: c.text, fontVariantNumeric: "tabular-nums" }}>{formatDate(tx.date)}</div>
                        <div style={{ fontSize: 11, color: c.textMute }}>{tx.accountName}</div>
                      </Td>
                      <Td c={c}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            // categoryColor at low opacity for the chip background
                            background: hexA(tx.categoryColor || c.textDim, 0.14),
                            color: tx.categoryColor || c.textDim,
                            display: "grid", placeItems: "center",
                            fontWeight: 600, fontSize: 14,
                          }}>{initialOf(tx.categoryName)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500 }}>{tx.merchant || tx.description || "Операция"}</div>
                            <div style={{ fontSize: 12, color: c.textDim }}>{tx.categoryName}</div>
                          </div>
                        </div>
                      </Td>
                      <Td c={c}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "4px 10px", borderRadius: 999,
                          fontSize: 12, fontWeight: 500,
                          background: isIn ? hexA(INCOME, 0.12) : hexA(EXPENSE, 0.10),
                          color: isIn ? INCOME : EXPENSE,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: isIn ? INCOME : EXPENSE,
                          }} />
                          {isIn ? "Доход" : "Расход"}
                        </span>
                      </Td>
                      <Td c={c} right>
                        <span style={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          color: isIn ? INCOME : c.text,
                          whiteSpace: "nowrap",
                        }}>
                          {isIn ? "+" : "−"}{formatMoney(tx.amount, tx.currency)}
                        </span>
                      </Td>
                      <Td c={c} right pr>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <IconBtnSmall c={c}><IconEdit /></IconBtnSmall>
                          <IconBtnSmall c={c}><IconDots /></IconBtnSmall>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Donut */}
          <Card c={c} radius={cardRadius} border={cardBorder} shadow={cardShadow}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Расходы по категориям
              </h2>
              <span style={{ fontSize: 12, color: c.textDim }}>{monthName}</span>
            </div>
            <div style={{ fontSize: 12, color: c.textDim, marginBottom: 18 }}>
              Топ-6 категорий месяца
            </div>

            <Donut categories={SPENDING_BY_CATEGORY} c={c} />

            <ul style={{
              listStyle: "none", padding: 0, margin: "20px 0 0",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {SPENDING_BY_CATEGORY.map(cat => (
                <li key={cat.categoryId} style={{
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: cat.categoryColor, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 14, flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{cat.categoryName}</span>
                  <span style={{
                    fontSize: 12, color: c.textDim,
                    fontVariantNumeric: "tabular-nums",
                    width: 36, textAlign: "right",
                  }}>{Math.round(Number(cat.percentage))}%</span>
                  <span style={{
                    fontSize: 14, fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                    width: 92, textAlign: "right", whiteSpace: "nowrap",
                  }}>{formatMoney(cat.total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* ════════════ Row 4: Budgets ════════════ */}
        <Card c={c} radius={cardRadius} border={cardBorder} shadow={cardShadow}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
          }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Бюджеты на {monthName.toLowerCase()}
            </h2>
            <span style={{
              fontSize: 12, color: c.textDim,
              background: c.surfaceAlt,
              padding: "3px 10px", borderRadius: 999,
              border: `1px solid ${c.border}`,
            }}>{BUDGETS.length}</span>
            <a href="/budgets" style={{
              marginLeft: "auto", fontSize: 13, fontWeight: 500,
              color: t.accent, textDecoration: "none",
            }}>Все бюджеты →</a>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}>
            {BUDGETS.map(b => <BudgetCard key={b.id} b={b} c={c} />)}
          </div>
        </Card>
      </main>

      {/* ════════════ Tweaks ════════════ */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Тема">
          <TweakRadio label="Режим" value={t.theme}
            options={[{value:"light",label:"Светлая"},{value:"dark",label:"Тёмная"}]}
            onChange={v => setTweak("theme", v)} />
        </TweakSection>
        <TweakSection label="Акцент">
          <TweakColor label="Цвет" value={t.accent} options={ACCENT_OPTIONS}
            onChange={v => setTweak("accent", v)} />
        </TweakSection>
        <TweakSection label="Карточки">
          <TweakRadio label="Стиль" value={t.cardStyle}
            options={[{value:"soft",label:"Мягкие"},{value:"flat",label:"Плоские"},{value:"outlined",label:"Контур"}]}
            onChange={v => setTweak("cardStyle", v)} />
          <TweakToggle label="Спарклайны" value={t.showSpark}
            onChange={v => setTweak("showSpark", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Subcomponents
// ════════════════════════════════════════════════════════════════════════════

function Card({ children, c, radius = 18, border, shadow, pad = 22, style }) {
  return (
    <div style={{
      background: c.surface,
      borderRadius: radius,
      border: border || "none",
      boxShadow: shadow || "none",
      padding: pad,
      boxSizing: "border-box",
      ...style,
    }}>{children}</div>
  );
}

function StatCard({
  label, value, sub, tint, radius, border, shadow,
  accent, valueColor, icon, showSpark, sparkColor, trend, progress, c,
}) {
  return (
    <div style={{
      background: tint,
      borderRadius: radius,
      border: border || "none",
      boxShadow: shadow || "none",
      padding: 20,
      display: "flex", flexDirection: "column", gap: 10,
      minHeight: 148, position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: hexA(accent, c.dark ? 0.22 : 0.14),
          color: accent, display: "grid", placeItems: "center",
        }}>{icon}</div>
        <div style={{ fontSize: 13, color: c.textDim, fontWeight: 500 }}>{label}</div>
      </div>

      <div style={{
        fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em",
        color: valueColor || c.text,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</div>

      <div style={{
        marginTop: "auto",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ fontSize: 12, color: c.textDim }}>
          {trend ? (
            <span style={{ color: trend.startsWith("+") ? INCOME : EXPENSE, fontWeight: 500 }}>
              {trend}
            </span>
          ) : sub}
        </div>
        {showSpark && progress == null && <Sparkline color={sparkColor} />}
        {progress != null && (
          <div style={{
            flex: 1, height: 6, borderRadius: 999,
            background: hexA(accent, 0.18),
            overflow: "hidden", marginLeft: 12,
          }}>
            <div style={{
              width: `${Math.min(100, progress * 100)}%`,
              height: "100%", background: accent, borderRadius: 999,
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Account card — mirrors the colored cards in real Dashboard ──────────────
function AccountCard({ acc, dark }) {
  const bg = acc.color || "#3B82F6";
  const typeLabel = ({
    card: "Карта", cash: "Наличные", savings: "Накопительный", wallet: "Кошелёк",
  })[acc.type] || acc.type;
  return (
    <div style={{
      flexShrink: 0, width: 220, padding: "16px 16px 18px",
      borderRadius: 14, color: "#fff",
      background: `linear-gradient(150deg, ${bg}, ${shade(bg, -22)})`,
      boxShadow: dark ? "none" : `0 10px 24px -16px ${hexA(bg, 0.6)}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
      }} />
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 18,
      }}>
        <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {typeLabel}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1 }}>{acc.icon}</div>
      </div>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 2 }}>{acc.name}</div>
      <div style={{
        fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}>{formatMoney(acc.balance, acc.currency)}</div>
    </div>
  );
}

function AddAccountCard({ accent, c }) {
  return (
    <button style={{
      flexShrink: 0, width: 220, minHeight: 116,
      borderRadius: 14,
      background: "transparent",
      border: `2px dashed ${c.border}`,
      color: c.textDim, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6,
      fontSize: 13, fontWeight: 500,
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: "50%",
        background: hexA(accent, 0.14), color: accent,
        display: "grid", placeItems: "center",
        fontSize: 18, lineHeight: 1,
      }}>+</span>
      Добавить счёт
    </button>
  );
}

// ── Budget card — uses ProgressBar stoplight semantics from real codebase ───
function BudgetCard({ b, c }) {
  const amount = Number(b.amount);
  const spent  = Number(b.spent);
  const pct    = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const remaining = amount - spent;

  // Stoplight: >=100% red, >=80% yellow, else green (frontend/src/components/ui/ProgressBar.tsx)
  const status = pct >= 100 ? "error" : pct >= 80 ? "warning" : "success";
  const statusColor = { success: INCOME, warning: "#F59E0B", error: EXPENSE }[status];
  const statusLabel = { success: "В норме", warning: "Близко", error: "Превышен" }[status];

  return (
    <div style={{
      background: c.surfaceAlt,
      border: `1px solid ${c.border}`,
      borderRadius: 14, padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 10, height: 10, borderRadius: 3,
          background: b.categoryColor, flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, fontWeight: 500, flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {b.name}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 500,
          padding: "2px 8px", borderRadius: 999,
          background: hexA(statusColor, 0.14), color: statusColor,
        }}>{statusLabel}</span>
      </div>

      <div>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 6,
        }}>
          <span style={{
            fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}>{formatMoney(spent, b.currency)}</span>
          <span style={{
            fontSize: 12, color: c.textDim,
            fontVariantNumeric: "tabular-nums",
          }}>из {formatMoney(amount, b.currency)}</span>
        </div>
        <div style={{
          height: 6, borderRadius: 999,
          background: c.dark ? "#262A3A" : "#E7E4DA",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${Math.min(100, pct)}%`, height: "100%",
            background: statusColor, borderRadius: 999,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
        {remaining >= 0
          ? <>Осталось <span style={{ color: c.text, fontWeight: 500 }}>{formatMoney(remaining, b.currency)}</span></>
          : <>Превышение <span style={{ color: EXPENSE, fontWeight: 500 }}>{formatMoney(-remaining, b.currency)}</span></>
        }
      </div>
    </div>
  );
}

function Sparkline({ color }) {
  const pts = [12, 18, 14, 22, 19, 26, 22, 30, 28, 34, 32, 38];
  const w = 80, h = 26, max = 40, min = 8;
  const step = w / (pts.length - 1);
  const ys = pts.map(p => h - ((p - min) / (max - min)) * h);
  const path = pts.map((_, i) => `${i === 0 ? "M" : "L"} ${i*step} ${ys[i].toFixed(1)}`).join(" ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = "g" + color.replace("#","");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ categories, c }) {
  const total = categories.reduce((s,x) => s + Number(x.total), 0);
  const size = 220, stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const gap = 2;
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "8px 0" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
             style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={c.dark ? "#2A2F3F" : "#EFEEE7"} strokeWidth={stroke} />
          {categories.map(cat => {
            const frac = Number(cat.total) / total;
            const len = Math.max(0, C * frac - gap);
            const dash = `${len} ${C - len}`;
            const seg = (
              <circle key={cat.categoryId}
                cx={cx} cy={cy} r={r} fill="none"
                stroke={cat.categoryColor}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += C * frac;
            return seg;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: c.textDim, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Всего
            </div>
            <div style={{
              fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}>{formatMoney(total)}</div>
            <div style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
              {categories.length} категорий
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, c, pl, pr, right }) {
  return (
    <th style={{
      textAlign: right ? "right" : "left",
      padding: "12px 12px",
      paddingLeft: pl ? 24 : 12,
      paddingRight: pr ? 24 : 12,
      fontWeight: 500, color: c.textMute,
    }}>{children}</th>
  );
}
function Td({ children, c, pl, pr, right }) {
  return (
    <td style={{
      padding: "14px 12px",
      paddingLeft: pl ? 24 : 12,
      paddingRight: pr ? 24 : 12,
      textAlign: right ? "right" : "left",
      verticalAlign: "middle", color: c.text,
    }}>{children}</td>
  );
}

function IconButton({ children, onClick, c }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 999,
      background: "transparent", border: "none",
      color: c.text, cursor: "pointer",
      display: "grid", placeItems: "center",
    }}>{children}</button>
  );
}
function IconBtnSmall({ children, c }) {
  return (
    <button style={{
      width: 28, height: 28, borderRadius: 8,
      background: "transparent",
      border: "1px solid transparent",
      color: c.textDim, cursor: "pointer",
      display: "grid", placeItems: "center",
    }}
    onMouseEnter={e => e.currentTarget.style.background = c.surfaceAlt}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </button>
  );
}

function Logo({ accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: accent,
        display: "grid", placeItems: "center",
        boxShadow: `0 6px 16px -6px ${accent}`,
        fontSize: 14, fontWeight: 700, color: "#fff",
        letterSpacing: "-0.04em",
      }}>₽</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Бабкосчёт</div>
        <div style={{ fontSize: 11, color: "#7A809B" }}>Личные финансы</div>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active, accent }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? "rgba(255,255,255,0.06)" : hover ? "rgba(255,255,255,0.03)" : "transparent";
  return (
    <a href={href || "#"} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", borderRadius: 10, textDecoration: "none",
      color: active ? "#FFFFFF" : "#B5B9CC",
      fontSize: 14, fontWeight: active ? 500 : 400,
      background: bg, position: "relative",
    }}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}>
      {active && (
        <span style={{
          position: "absolute", left: -18, top: 8, bottom: 8,
          width: 3, borderRadius: 999, background: accent,
        }} />
      )}
      <Icon active={active} />
      <span>{label}</span>
    </a>
  );
}

function SidebarBtn({ icon, label, onClick, danger }) {
  const [hover, setHover] = React.useState(false);
  const baseColor = "#9CA3AF";
  const hoverBg = danger ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)";
  const hoverColor = danger ? "#EF4444" : "#FFFFFF";
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "8px 12px", borderRadius: 10, textAlign: "left",
        background: hover ? hoverBg : "transparent",
        color: hover ? hoverColor : baseColor,
        fontSize: 13, fontWeight: 400, border: "none", cursor: "pointer",
        width: "100%",
      }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SavingsMini({ accent, value, goal }) {
  const pct = Math.max(0, Math.min(100, (value / goal) * 100));
  return (
    <div style={{
      borderRadius: 14, padding: 14,
      background: `linear-gradient(160deg, ${hexA(accent, 0.18)}, ${hexA(accent, 0.04)})`,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        fontSize: 11, color: "#9298AC",
        letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6,
      }}>Копилка</div>
      <div style={{
        fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em",
        fontVariantNumeric: "tabular-nums",
      }}>{formatMoney(value)}</div>
      <div style={{
        height: 5, borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        marginTop: 10, overflow: "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 11, color: "#9298AC", marginTop: 8 }}>
        {Math.round(pct)}% от цели {formatMoney(goal)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Color utils
// ════════════════════════════════════════════════════════════════════════════
function hexA(hex, a) {
  const h = hex.replace("#","");
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}
function shade(hex, percent) {
  const h = hex.replace("#","");
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0xff) + amt;
  const B = (num & 0xff) + amt;
  const clamp = (n) => Math.max(0, Math.min(255, n));
  return "#" + (0x1000000 + clamp(R)*0x10000 + clamp(G)*0x100 + clamp(B)).toString(16).slice(1);
}

// ════════════════════════════════════════════════════════════════════════════
// Icons
// ════════════════════════════════════════════════════════════════════════════
function svg(d, extra) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...extra}>
      {d}
    </svg>
  );
}
function IconHome()      { return svg(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>); }
function IconList()      { return svg(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>); }
function IconChart()     { return svg(<><path d="M3 20h18" /><path d="M6 16v-4M11 16v-8M16 16v-2M21 16v-6" /></>); }
function IconTarget()    { return svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor"/></>); }
function IconBell()      { return svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></>); }
function IconWallet()    { return svg(<><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" /><path d="M22 11h-5a2 2 0 1 0 0 4h5z" /></>); }
function IconArrowDown() { return svg(<><path d="M12 5v14M5 13l7 7 7-7" /></>); }
function IconArrowUp()   { return svg(<><path d="M12 19V5M5 11l7-7 7 7" /></>); }
function IconPig()       { return svg(<><path d="M16 4l1 3h3v4l-2 1a6 6 0 0 1-6 6H8a5 5 0 0 1-5-5v-1a5 5 0 0 1 5-5h6" /><circle cx="16" cy="11" r="0.6" fill="currentColor"/><path d="M5 18v2M11 18v2" /></>); }
function IconEdit()      { return svg(<><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M14 6l4 4" /></>); }
function IconDots()      { return svg(<><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></>); }
function Chevron({ dir }) {
  const d = dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return svg(<path d={d} />);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
