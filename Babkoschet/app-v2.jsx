// Бабкосчёт — Dashboard (v2)
// ────────────────────────────────────────────────────────────────────────────
// Built to mirror the actual finance-app codebase (IceFice/finance-app):
//   • Card:        bg-white dark:bg-gray-900 rounded-xl border shadow-sm
//   • Badge:       inline rounded-full px-2 py-0.5 text-xs font-medium
//   • Button:      rounded-lg, primary = brand-600 (was blue-600)
//   • ProgressBar: h-2 rounded-full, stoplight colors
//   • Layout:      sticky sidebar + h-16 topbar + p-6 main, max-w-7xl
//   • Money:       Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB' })
//   • Dates:       d MMM (ru) — re-implemented inline since date-fns is heavy
//
// Brand overrides per design brief:
//   accent  →  #6366F1 (indigo / "brand")  replaces blue-600
//   income  →  #22C55E  (green-500)
//   expense →  #EF4444  (red-500)
//   sidebar →  #1E2235  (dark slate)       overrides the template's white sidebar

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6366F1",
  "density": "regular",
  "showWelcome": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B"];

// ─── Format helpers (mirror frontend/src/lib/utils.ts) ──────────────────────
const fmtMoney = (n, currency = "RUB") =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency", currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n).replace(/\s/g, " "); // keep nbsp

const MONTHS_RU = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const MONTHS_RU_LONG = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
};

// ─── Data ───────────────────────────────────────────────────────────────────
// All amounts in RUB. Dates are May 2026.
const NAV_ITEMS = [
  { to: "/dashboard",    label: "Главная",   icon: "🏠", active: true },
  { to: "/transactions", label: "Операции",  icon: "💳" },
  { to: "/reports",      label: "Отчёты",    icon: "📊" },
  { to: "/categories",   label: "Категории", icon: "🏷️" },
  { to: "/settings",     label: "Настройки", icon: "⚙️" },
];

const SUMMARY = {
  balance:    287450,
  income:     145000,
  expenses:   -82340,
  savings:    62660,
  trendIncome:  "+12% к апрелю",
  trendExpense: "−4% к апрелю",
  savingsGoal:  80000,
};

const OPERATIONS = [
  { id: 1, date: "2026-05-18", cat: "Продукты",          letter: "П", type: "Расход", amount: -2480,  note: "Перекрёсток" },
  { id: 2, date: "2026-05-17", cat: "Зарплата",          letter: "З", type: "Доход",  amount: 120000, note: "ООО Контур" },
  { id: 3, date: "2026-05-16", cat: "Кафе и рестораны",  letter: "К", type: "Расход", amount: -890,   note: "Surf Coffee" },
  { id: 4, date: "2026-05-15", cat: "Транспорт",         letter: "Т", type: "Расход", amount: -1240,  note: "Метро + такси" },
  { id: 5, date: "2026-05-14", cat: "Развлечения",       letter: "Р", type: "Расход", amount: -1800,  note: "Кинотеатр" },
  { id: 6, date: "2026-05-13", cat: "Фриланс",           letter: "Ф", type: "Доход",  amount: 25000,  note: "Заказчик #2" },
  { id: 7, date: "2026-05-12", cat: "Аренда",            letter: "А", type: "Расход", amount: -45000, note: "Квартира" },
  { id: 8, date: "2026-05-11", cat: "Покупки",           letter: "По", type: "Расход", amount: -4320,  note: "Ozon" },
];

// Donut categories — top 6 of May. Colors come from the codebase's COLORS const
// (Dashboard/index.tsx) with the brand override applied to the leading slot.
const CATEGORIES = [
  { id: "rent",      name: "Аренда",            value: 45000, color: "#6366F1" }, // brand
  { id: "groceries", name: "Продукты",          value: 12480, color: "#EF4444" },
  { id: "cafe",      name: "Кафе и рестораны",  value: 8890,  color: "#F59E0B" },
  { id: "transport", name: "Транспорт",         value: 6240,  color: "#22C55E" },
  { id: "fun",       name: "Развлечения",       value: 5800,  color: "#8B5CF6" },
  { id: "shopping",  name: "Покупки",           value: 3930,  color: "#EC4899" },
];

// ============================================================================
// Components (each mirrors a real file in frontend/src/components/ui)
// ============================================================================

// → Card.tsx
function Card({ className = "", children }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// → Badge.tsx
function Badge({ variant = "default", className = "", children }) {
  const variants = {
    default: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    warning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    error:   "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    info:    "bg-brand-100/70 dark:bg-brand-900/30 text-brand-700 dark:text-brand-100",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// → Button.tsx (primary uses brand-600 instead of blue-600)
function Button({ variant = "primary", size = "md", className = "", children, ...props }) {
  const v = {
    primary:   "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
    secondary: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700",
    ghost:     "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
    danger:    "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  const s = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  }[size];
  return (
    <button {...props}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${v} ${s} ${className}`}>
      {children}
    </button>
  );
}

// → ProgressBar.tsx
function ProgressBar({ value, className = "", showLabel = false, accent }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = accent
    ? null
    : clamped >= 100 ? "bg-red-500" : clamped >= 80 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color ?? ""}`}
          style={{ width: `${clamped}%`, background: accent || undefined }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{clamped.toFixed(0)}%</span>
      )}
    </div>
  );
}

// ============================================================================
// App
// ============================================================================
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Theme: write to <html class="dark"> to match the codebase's strategy (index.html)
  React.useEffect(() => {
    const html = document.documentElement;
    if (t.theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [t.theme]);

  // Live accent override — overwrites the brand-600 token in real time
  React.useEffect(() => {
    const cfg = window.tailwind?.config;
    if (!cfg) return;
    cfg.theme.extend.colors.brand[600] = t.accent;
    cfg.theme.extend.colors.brand[700] = shade(t.accent, -8);
    cfg.theme.extend.colors.brand[800] = shade(t.accent, -16);
    cfg.theme.extend.colors.brand[500] = shade(t.accent, +8);
    cfg.theme.extend.colors.brand[100] = mix(t.accent, "#FFFFFF", 0.88);
    cfg.theme.extend.colors.brand[50]  = mix(t.accent, "#FFFFFF", 0.94);
    // Re-run tailwind to pick up the change
    if (typeof window.tailwind.refresh === "function") window.tailwind.refresh();
  }, [t.accent]);

  const [month, setMonth] = React.useState({ y: 2026, m: 4 });
  const stepMonth = (d) => setMonth(({ y, m }) => {
    let nm = m + d, ny = y;
    if (nm < 0)  { nm = 11; ny--; }
    if (nm > 11) { nm = 0;  ny++; }
    return { y: ny, m: nm };
  });

  const pad = t.density === "compact" ? "p-4" : t.density === "comfy" ? "p-7" : "p-5";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* ═════════ Sidebar (override: dark per brief) ═════════ */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-gray-200 border-r border-black/20 flex-shrink-0">
        {/* Logo — matches AppLayout height (h-16) */}
        <div className="h-16 flex items-center px-4 border-b border-white/5 flex-shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            Б
          </div>
          <span className="ml-3 font-semibold text-white truncate tracking-tight">Бабкосчёт</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <a key={item.to} href={item.to}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                item.active
                  ? "bg-brand-600/15 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              ].join(" ")}>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{background: t.accent}} />
              )}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
            <span className="flex-shrink-0">{t.theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{t.theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <span className="flex-shrink-0">🚪</span>
            <span>Выйти</span>
          </button>
          <div className="px-3 py-2 text-xs text-gray-500 truncate">anna@babkoschet.ru</div>
        </div>
      </aside>

      {/* ═════════ Main column ═════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — h-16 to match AppLayout */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 flex-shrink-0 gap-4">
          <button className="hidden md:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            ☰
          </button>

          {/* Month selector */}
          <div className="flex items-center gap-1">
            <button onClick={() => stepMonth(-1)}
              className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
              ←
            </button>
            <div className="px-3 min-w-[140px] text-center text-sm font-medium text-gray-900 dark:text-white tabular-nums">
              {MONTHS_RU_LONG[month.m]} {month.y}
            </div>
            <button onClick={() => stepMonth(1)}
              className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
              →
            </button>
          </div>

          <div className="flex-1" />

          {/* Bell */}
          <button className="relative w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
            <span className="text-base">🔔</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{background: t.accent}} />
          </button>

          <Button variant="primary" size="md">+ Добавить</Button>

          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-800">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">АП</div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Аня Петрова</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

            {/* H1 + welcome strip */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Главная</h1>
                {t.showWelcome && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Сводка за {MONTHS_RU_LONG[month.m].toLowerCase()} {month.y}. Накопления растут — продолжайте в том же духе.
                  </p>
                )}
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Данные обновлены 5 минут назад
              </div>
            </div>

            {/* ════ 4 summary cards ════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className={pad}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Баланс</p>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Все счета</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white tnum">
                  {fmtMoney(SUMMARY.balance)}
                </p>
                <div className="mt-3"><Sparkline color={t.accent} variant="up" /></div>
              </Card>

              <Card className={pad}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Доходы</p>
                  <Badge variant="success">{SUMMARY.trendIncome}</Badge>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400 tnum">
                  +{fmtMoney(SUMMARY.income)}
                </p>
                <div className="mt-3"><Sparkline color="#22C55E" variant="up" /></div>
              </Card>

              <Card className={pad}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Расходы</p>
                  <Badge variant="error">{SUMMARY.trendExpense}</Badge>
                </div>
                <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400 tnum">
                  {fmtMoney(SUMMARY.expenses)}
                </p>
                <div className="mt-3"><Sparkline color="#EF4444" variant="down" /></div>
              </Card>

              <Card className={pad}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Сбережения</p>
                  <Badge variant="info">{Math.round(SUMMARY.savings / SUMMARY.savingsGoal * 100)}%</Badge>
                </div>
                <p className="text-2xl font-bold mt-1 tnum" style={{color: t.accent}}>
                  +{fmtMoney(SUMMARY.savings)}
                </p>
                <div className="mt-3">
                  <ProgressBar value={SUMMARY.savings / SUMMARY.savingsGoal * 100} accent={t.accent} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    цель {fmtMoney(SUMMARY.savingsGoal)}
                  </p>
                </div>
              </Card>
            </div>

            {/* ════ Transactions table + Donut ════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Transactions table — spans 2 cols */}
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between p-5 pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Последние операции</h2>
                    <Badge variant="default">{OPERATIONS.length}</Badge>
                  </div>
                  <a href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-500">
                    Все операции →
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left font-medium uppercase tracking-wider px-5 py-2.5">Дата</th>
                        <th className="text-left font-medium uppercase tracking-wider px-3 py-2.5">Категория</th>
                        <th className="text-left font-medium uppercase tracking-wider px-3 py-2.5">Тип</th>
                        <th className="text-right font-medium uppercase tracking-wider px-3 py-2.5">Сумма</th>
                        <th className="text-right font-medium uppercase tracking-wider px-5 py-2.5">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OPERATIONS.map((op, i) => {
                        const isIn = op.type === "Доход";
                        return (
                          <tr key={op.id}
                            className={i < OPERATIONS.length - 1 ? "border-b border-gray-100 dark:border-gray-800/50" : ""}>
                            <td className="px-5 py-3 text-gray-600 dark:text-gray-400 tnum whitespace-nowrap">
                              {fmtDate(op.date)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                  {op.letter}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{op.cat}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{op.note}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant={isIn ? "success" : "error"}>{op.type}</Badge>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className={`text-sm font-semibold tnum ${isIn ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
                                {isIn ? "+" : "−"}{fmtMoney(Math.abs(op.amount))}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="inline-flex gap-1">
                                <IconBtn label="Изменить">✏️</IconBtn>
                                <IconBtn label="Ещё">⋯</IconBtn>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Donut card */}
              <Card className={pad}>
                <div className="flex items-baseline justify-between mb-1">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Расходы по категориям</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Топ-6 категорий месяца</p>

                <Donut categories={CATEGORIES} />

                <ul className="space-y-2.5 mt-4">
                  {CATEGORIES.map(cat => {
                    const total = CATEGORIES.reduce((s,x) => s+x.value, 0);
                    const pct = (cat.value / total * 100);
                    return (
                      <li key={cat.id} className="flex items-center gap-3 text-sm">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background: cat.color}} />
                        <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{cat.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 tnum w-10 text-right">{pct.toFixed(0)}%</span>
                        <span className="font-medium text-gray-900 dark:text-white tnum w-20 text-right">
                          {fmtMoney(cat.value)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>

          </div>
        </main>
      </div>

      {/* ═════════ Tweaks ═════════ */}
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
        <TweakSection label="Плотность">
          <TweakRadio label="Карточки" value={t.density}
            options={[{value:"compact",label:"Плотно"},{value:"regular",label:"Средне"},{value:"comfy",label:"Просто"}]}
            onChange={v => setTweak("density", v)} />
        </TweakSection>
        <TweakSection label="Шапка">
          <TweakToggle label="Подзаголовок" value={t.showWelcome}
            onChange={v => setTweak("showWelcome", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ============================================================================
// Bits & pieces
// ============================================================================

function IconBtn({ children, label }) {
  return (
    <button aria-label={label}
      className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center text-sm">
      {children}
    </button>
  );
}

function Sparkline({ color, variant = "up" }) {
  // Two canned curves — gentle rise / fall
  const data = variant === "up"
    ? [14, 18, 16, 22, 19, 26, 22, 30, 28, 32, 30, 34]
    : [30, 26, 28, 22, 24, 20, 22, 18, 16, 18, 14, 16];
  const w = 100, h = 28, max = 36, min = 10;
  const step = w / (data.length - 1);
  const ys = data.map(p => h - ((p - min) / (max - min)) * h);
  const path = data.map((_, i) => `${i === 0 ? "M" : "L"} ${i*step} ${ys[i].toFixed(1)}`).join(" ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = "g" + color.replace("#","").toLowerCase();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ categories }) {
  const total = categories.reduce((s,x) => s + x.value, 0);
  const size = 200, stroke = 24;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const gap = 2;
  let offset = 0;
  return (
    <div className="relative w-full grid place-items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
           className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgb(229 231 235)" className="dark:[stroke:rgb(31_41_55)]"
          strokeWidth={stroke} />
        {categories.map(cat => {
          const frac = cat.value / total;
          const len = Math.max(0, C * frac - gap);
          const dash = `${len} ${C - len}`;
          const el = (
            <circle key={cat.id}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={cat.color} strokeWidth={stroke}
              strokeDasharray={dash} strokeDashoffset={-offset} />
          );
          offset += C * frac;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Всего</p>
          <p className="text-xl font-bold tnum text-gray-900 dark:text-white">{fmtMoney(total)}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">6 категорий</p>
        </div>
      </div>
    </div>
  );
}

// ─── Color utils ────────────────────────────────────────────────────────────
function shade(hex, percent) {
  const h = hex.replace("#",""), n = parseInt(h, 16), a = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (n >> 16) + a));
  const G = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + a));
  const B = Math.max(0, Math.min(255, (n & 0xff) + a));
  return "#" + (0x1000000 + R*0x10000 + G*0x100 + B).toString(16).slice(1);
}
function mix(a, b, t) {
  const ah = a.replace("#",""), bh = b.replace("#","");
  const ar = parseInt(ah.slice(0,2),16), ag = parseInt(ah.slice(2,4),16), ab = parseInt(ah.slice(4,6),16);
  const br = parseInt(bh.slice(0,2),16), bg = parseInt(bh.slice(2,4),16), bb = parseInt(bh.slice(4,6),16);
  const r = Math.round(ar*(1-t) + br*t), g = Math.round(ag*(1-t) + bg*t), bl = Math.round(ab*(1-t) + bb*t);
  return "#" + (0x1000000 + r*0x10000 + g*0x100 + bl).toString(16).slice(1);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
