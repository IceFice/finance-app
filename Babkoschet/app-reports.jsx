// ════════════════════════════════════════════════════════════════════════════
// Бабкосчёт — Reports (Отчёты)
// Mirrors frontend/src/pages/Reports/index.tsx:
//   Tabs: Обзор / По категориям / Денежный поток / Бюджет vs Факт
//   Presets: Этот месяц / Последние 3 месяца / Этот год  (+ custom range)
// All charts hand-rolled SVG — no recharts dependency in this static design.
// ════════════════════════════════════════════════════════════════════════════

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6366F1",
  "cardStyle": "soft",
  "showSpark": true
}/*EDITMODE-END*/;

const TABS = [
  { key: "overview", label: "Обзор",            icon: "📈" },
  { key: "category", label: "По категориям",    icon: "🍩" },
  { key: "cashflow", label: "Денежный поток",   icon: "📊" },
  { key: "budget",   label: "Бюджет vs Факт",   icon: "🎯" },
];

const PRESETS = [
  { key: "this_month",   label: "Этот месяц" },
  { key: "last_3_months",label: "Последние 3 месяца" },
  { key: "this_year",    label: "Этот год" },
];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const c = useTheme(t);
  const cl = cardLook(t, c);

  const [tab, setTab]       = React.useState("overview");
  const [preset, setPreset] = React.useState("last_3_months");
  const [from, setFrom] = React.useState("2026-03-01");
  const [to,   setTo]   = React.useState("2026-05-31");

  const applyPreset = (key) => {
    setPreset(key);
    if (key === "this_month")     { setFrom("2026-05-01"); setTo("2026-05-31"); }
    if (key === "last_3_months")  { setFrom("2026-03-01"); setTo("2026-05-31"); }
    if (key === "this_year")      { setFrom("2026-01-01"); setTo("2026-12-31"); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: c.bg, color: c.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", letterSpacing: "-0.01em",
    }}>
      <Sidebar activeRoute="/reports" accent={t.accent} theme={t.theme}
        onThemeToggle={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}
        savings={62660} savingsGoal={SAVINGS_GOAL} />

      <main style={{ flex: 1, padding: "28px 36px 64px", minWidth: 0 }}>
        {/* Custom topbar: no month stepper here (we have date range instead) */}
        <header style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: c.textDim, marginBottom: 4 }}>
              Аналитика по периодам и категориям
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Отчёты
            </h1>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{
              padding: "0 14px", height: 40, borderRadius: 12,
              background: c.surface, border: `1px solid ${c.border}`,
              color: c.text, cursor: "pointer",
              fontSize: 14, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              <IconDownload /> Экспортировать PDF
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
          </div>
        </header>

        {/* ════════════ Date range ════════════ */}
        <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}
              pad={16} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{
              fontSize: 12, color: c.textMute, letterSpacing: "0.06em",
              textTransform: "uppercase", fontWeight: 500,
            }}>Период</div>

            <PillGroup value={preset} c={c} accent={t.accent}
              options={PRESETS.map(p => ({ value: p.key, label: p.label }))}
              onChange={applyPreset} />

            <span style={{ color: c.textMute, fontSize: 13 }}>или</span>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DateInput value={from} onChange={(v) => { setFrom(v); setPreset(""); }} c={c} />
              <span style={{ color: c.textMute }}>—</span>
              <DateInput value={to}   onChange={(v) => { setTo(v); setPreset(""); }}   c={c} />
            </div>

            <div style={{ marginLeft: "auto", fontSize: 13, color: c.textDim }}>
              {formatDateLong(from)} — {formatDateLong(to)}
            </div>
          </div>
        </Card>

        {/* ════════════ Tabs ════════════ */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 18,
          borderBottom: `1px solid ${c.border}`,
        }}>
          {TABS.map(tb => {
            const active = tb.key === tab;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                padding: "12px 18px", border: "none",
                background: "transparent", cursor: "pointer",
                fontSize: 14, fontWeight: active ? 600 : 500,
                color: active ? c.text : c.textDim,
                position: "relative",
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 15 }}>{tb.icon}</span>
                {tb.label}
                {active && (
                  <span style={{
                    position: "absolute", left: 14, right: 14, bottom: -1,
                    height: 3, borderRadius: 999, background: t.accent,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ════════════ Tab content ════════════ */}
        {tab === "overview" && <OverviewTab c={c} cl={cl} t={t} />}
        {tab === "category" && <CategoryTab c={c} cl={cl} t={t} />}
        {tab === "cashflow" && <CashFlowTab c={c} cl={cl} t={t} />}
        {tab === "budget"   && <BudgetVsActualTab c={c} cl={cl} t={t} />}
      </main>

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
// TAB 1 — Обзор
// ════════════════════════════════════════════════════════════════════════════
function OverviewTab({ c, cl, t }) {
  const months = MONTHLY_SUMMARY;
  const totalIn  = months.reduce((s,m) => s + Number(m.income),  0);
  const totalOut = months.reduce((s,m) => s + Number(m.expenses), 0);
  const net = totalIn - totalOut;
  const avgSavings = net / months.length;
  const savingsRate = totalIn > 0 ? net / totalIn : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Stat strip */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
        <StatCard label="Доходы" value={`+${formatMoney(totalIn)}`} sub={`за ${months.length} мес.`}
          tint={cl.bg(c.dark ? "#142421" : "#E8F7EE")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={INCOME} valueColor={INCOME} icon={<IconArrowDown />} c={c}>
          {t.showSpark && <Sparkline color={INCOME} points={months.map(m => Number(m.income)/1000)} />}
        </StatCard>
        <StatCard label="Расходы" value={`−${formatMoney(totalOut)}`} sub={`за ${months.length} мес.`}
          tint={cl.bg(c.dark ? "#2A1A1F" : "#FDECEC")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={EXPENSE} valueColor={EXPENSE} icon={<IconArrowUp />} c={c}>
          {t.showSpark && <Sparkline color={EXPENSE} points={months.map(m => Number(m.expenses)/1000)} />}
        </StatCard>
        <StatCard label="Чистые сбережения" value={`+${formatMoney(net)}`}
          sub={`в среднем ${formatMoney(avgSavings)}/мес`}
          tint={cl.bg(c.dark ? "#1B1B30" : "#EEEBFB")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={t.accent} valueColor={t.accent} icon={<IconPig />} c={c}>
          {t.showSpark && <Sparkline color={t.accent} points={months.map(m => Number(m.net)/1000)} />}
        </StatCard>
        <StatCard label="Норма сбережений" value={`${Math.round(savingsRate * 100)}%`}
          sub={savingsRate >= 0.25 ? "отлично" : savingsRate >= 0.15 ? "хорошо" : "стоит увеличить"}
          tint={cl.bg(c.dark ? "#1A2230" : "#EEF0FF")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={t.accent} valueColor={c.text} icon={<IconTarget />} c={c}
          progress={Math.min(1, savingsRate / 0.4)} />
      </section>

      {/* Income vs Expense bars */}
      <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
        <SectionHeader title="Доходы и расходы по месяцам" c={c}
          right={<Legend items={[
            { color: INCOME,  label: "Доходы"  },
            { color: EXPENSE, label: "Расходы" },
          ]} c={c} />} />
        <IncomeExpenseBars months={months} c={c} />
      </Card>

      {/* Net savings line */}
      <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
        <SectionHeader title="Чистые сбережения" c={c}
          right={<span style={{ fontSize: 13, color: c.textDim }}>
            Тренд за {months.length} месяцев
          </span>} />
        <NetSavingsArea months={months} c={c} accent={t.accent} />
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — По категориям
// ════════════════════════════════════════════════════════════════════════════
function CategoryTab({ c, cl, t }) {
  const cats = SPENDING_BY_CATEGORY;
  const total = cats.reduce((s,x) => s + Number(x.total), 0);
  const top = cats[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        <StatCard label="Всего расходов" value={formatMoney(total)} sub={`${cats.length} категорий`}
          tint={cl.bg(c.dark ? "#2A1A1F" : "#FDECEC")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={EXPENSE} icon={<IconArrowUp />} c={c}>
          {t.showSpark && <Sparkline color={EXPENSE} />}
        </StatCard>
        <StatCard label="Крупнейшая категория" value={top.categoryName}
          sub={`${formatMoney(top.total)} · ${Math.round(Number(top.percentage))}%`}
          tint={cl.bg(c.dark ? "#1B1B30" : "#EEEBFB")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={top.categoryColor} icon={<IconWallet />} c={c} />
        <StatCard label="Средний чек" value={formatMoney(total / Math.max(1, 15))}
          sub="по всем расходам месяца"
          tint={cl.bg(c.dark ? "#1A2230" : "#EEF0FF")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={t.accent} icon={<IconList />} c={c}>
          {t.showSpark && <Sparkline color={t.accent} />}
        </StatCard>
      </section>

      <section style={{
        display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 18,
        alignItems: "start",
      }}>
        {/* Donut */}
        <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
          <SectionHeader title="Структура расходов" c={c} />
          <CategoryDonut categories={cats} total={total} c={c} />
          <ul style={{
            listStyle: "none", padding: 0, margin: "20px 0 0",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {cats.map(cat => (
              <li key={cat.categoryId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: cat.categoryColor }} />
                <span style={{ fontSize: 14, flex: 1, minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cat.categoryName}
                </span>
                <span style={{ fontSize: 12, color: c.textDim,
                  fontVariantNumeric: "tabular-nums", width: 36, textAlign: "right" }}>
                  {Math.round(Number(cat.percentage))}%
                </span>
                <span style={{ fontSize: 14, fontWeight: 500,
                  fontVariantNumeric: "tabular-nums", width: 96, textAlign: "right" }}>
                  {formatMoney(cat.total)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Horizontal bars + table */}
        <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
          <SectionHeader title="Расходы по категориям" c={c}
            right={<a href="#" style={{ fontSize: 13, fontWeight: 500, color: t.accent, textDecoration: "none" }}>Скачать CSV</a>} />

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{
                fontSize: 11, color: c.textMute,
                textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500,
              }}>
                <th style={{ textAlign: "left", padding: "10px 0" }}>Категория</th>
                <th style={{ textAlign: "left", padding: "10px 12px", width: "45%" }}>Доля</th>
                <th style={{ textAlign: "right", padding: "10px 0" }}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {cats.map(cat => {
                const pct = Number(cat.percentage);
                return (
                  <tr key={cat.categoryId} style={{ borderTop: `1px solid ${c.border}` }}>
                    <td style={{ padding: "14px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: hexA(cat.categoryColor, 0.14),
                          color: cat.categoryColor,
                          display: "grid", placeItems: "center",
                          fontSize: 12, fontWeight: 600,
                        }}>{initialOf(cat.categoryName)}</span>
                        <span style={{ fontWeight: 500 }}>{cat.categoryName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <div style={{
                          flex: 1, height: 6, borderRadius: 999,
                          background: hexA(cat.categoryColor, 0.14),
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${pct}%`, height: "100%",
                            background: cat.categoryColor, borderRadius: 999,
                          }} />
                        </div>
                        <span style={{
                          fontSize: 12, color: c.textDim, width: 36,
                          textAlign: "right", fontVariantNumeric: "tabular-nums",
                        }}>{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td style={{
                      padding: "14px 0", textAlign: "right",
                      fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}>{formatMoney(cat.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Денежный поток
// ════════════════════════════════════════════════════════════════════════════
function CashFlowTab({ c, cl, t }) {
  const months = MONTHLY_SUMMARY;
  const totalNet = months.reduce((s,m) => s + Number(m.net), 0);
  const totalIn  = months.reduce((s,m) => s + Number(m.income), 0);
  const totalOut = months.reduce((s,m) => s + Number(m.expenses), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        <StatCard label="Приток" value={`+${formatMoney(totalIn)}`} sub={`за ${months.length} мес.`}
          tint={cl.bg(c.dark ? "#142421" : "#E8F7EE")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={INCOME} valueColor={INCOME} icon={<IconArrowDown />} c={c} />
        <StatCard label="Отток" value={`−${formatMoney(totalOut)}`} sub={`за ${months.length} мес.`}
          tint={cl.bg(c.dark ? "#2A1A1F" : "#FDECEC")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={EXPENSE} valueColor={EXPENSE} icon={<IconArrowUp />} c={c} />
        <StatCard label="Чистый поток" value={`${totalNet >= 0 ? "+" : "−"}${formatMoney(Math.abs(totalNet))}`}
          sub={totalNet >= 0 ? "положительный" : "отрицательный"}
          tint={cl.bg(c.dark ? "#1B1B30" : "#EEEBFB")}
          radius={cl.radius} border={cl.border} shadow={cl.shadow}
          accent={t.accent} valueColor={totalNet >= 0 ? INCOME : EXPENSE}
          icon={<IconRepeat />} c={c} />
      </section>

      <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
        <SectionHeader title="Денежный поток по месяцам" c={c}
          right={<Legend items={[
            { color: INCOME,  label: "Доходы" },
            { color: EXPENSE, label: "Расходы" },
            { color: t.accent, label: "Чистый поток", dashed: true },
          ]} c={c} />} />
        <CashFlowChart months={months} c={c} accent={t.accent} />
      </Card>

      <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
        <SectionHeader title="Помесячная разбивка" c={c} />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{
              fontSize: 11, color: c.textMute,
              textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500,
            }}>
              <th style={{ textAlign: "left", padding: "10px 0" }}>Месяц</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Доходы</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Расходы</th>
              <th style={{ textAlign: "right", padding: "10px 0" }}>Чистый поток</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const net = Number(m.net);
              return (
                <tr key={m.month} style={{ borderTop: `1px solid ${c.border}` }}>
                  <td style={{ padding: "14px 0", fontWeight: 500 }}>{m.month} 2026</td>
                  <td style={{ padding: "14px 12px", textAlign: "right",
                    fontVariantNumeric: "tabular-nums", color: INCOME, fontWeight: 500 }}>
                    +{formatMoney(m.income)}
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "right",
                    fontVariantNumeric: "tabular-nums", color: EXPENSE, fontWeight: 500 }}>
                    −{formatMoney(m.expenses)}
                  </td>
                  <td style={{
                    padding: "14px 0", textAlign: "right", fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: net >= 0 ? INCOME : EXPENSE,
                  }}>{net >= 0 ? "+" : "−"}{formatMoney(Math.abs(net))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — Бюджет vs Факт
// ════════════════════════════════════════════════════════════════════════════
function BudgetVsActualTab({ c, cl, t }) {
  const items = BUDGETS.filter(b => b.period === "monthly");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
        <SectionHeader title="Бюджет vs Фактические расходы" c={c}
          right={<Legend items={[
            { color: hexA(t.accent, 0.45), label: "Лимит", solid: true },
            { color: t.accent, label: "Фактически" },
            { color: EXPENSE, label: "Превышение" },
          ]} c={c} />} />
        <BudgetVsActualReportChart budgets={items} c={c} accent={t.accent} />
      </Card>

      <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
        <SectionHeader title="Детализация" c={c} count={items.length} />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{
              fontSize: 11, color: c.textMute,
              textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500,
            }}>
              <th style={{ textAlign: "left",  padding: "10px 0" }}>Бюджет</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Лимит</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Факт</th>
              <th style={{ textAlign: "left",  padding: "10px 12px", width: "35%" }}>Использовано</th>
              <th style={{ textAlign: "right", padding: "10px 0" }}>Разница</th>
            </tr>
          </thead>
          <tbody>
            {items.map(b => {
              const limit = Number(b.amount), spent = Number(b.spent);
              const pct = Math.round((spent / limit) * 100);
              const diff = limit - spent;
              const isOver = spent > limit;
              const statusColor = isOver ? EXPENSE : pct >= 80 ? WARN : INCOME;
              return (
                <tr key={b.id} style={{ borderTop: `1px solid ${c.border}` }}>
                  <td style={{ padding: "14px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: hexA(b.categoryColor, 0.14),
                        color: b.categoryColor,
                        display: "grid", placeItems: "center",
                        fontSize: 12, fontWeight: 600,
                      }}>{initialOf(b.name)}</span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: c.textMute }}>
                          {b.categoryName || "Все категории"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 12px", textAlign: "right",
                    fontVariantNumeric: "tabular-nums", color: c.textDim }}>
                    {formatMoney(limit)}
                  </td>
                  <td style={{
                    padding: "14px 12px", textAlign: "right", fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: statusColor,
                  }}>{formatMoney(spent)}</td>
                  <td style={{ padding: "14px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        flex: 1, position: "relative",
                        height: 6, borderRadius: 999,
                        background: c.dark ? "#262A3A" : "#EFEEE7",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${Math.min(100, pct)}%`, height: "100%",
                          background: statusColor, borderRadius: 999,
                        }} />
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 500, width: 38, textAlign: "right",
                        color: statusColor, fontVariantNumeric: "tabular-nums",
                      }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{
                    padding: "14px 0", textAlign: "right", fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    color: diff >= 0 ? INCOME : EXPENSE,
                  }}>{diff >= 0 ? "+" : "−"}{formatMoney(Math.abs(diff))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Hand-rolled SVG charts
// ════════════════════════════════════════════════════════════════════════════

// ── Income vs Expense — grouped bars ──
function IncomeExpenseBars({ months, c }) {
  const W = 1080, H = 280;
  const padL = 56, padR = 16, padT = 16, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...months.flatMap(m => [Number(m.income), Number(m.expenses)]));
  const niceMax = Math.ceil(max / 20000) * 20000;
  const ticks = 4;
  const groupW = innerW / months.length;
  const barW = Math.min(30, (groupW - 24) / 2);
  const gap = 8;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {Array.from({ length: ticks + 1 }, (_, i) => i / ticks).map((g, i) => {
        const y = padT + (1 - g) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={c.border} strokeDasharray="3 4" />
            <text x={padL - 8} y={y + 4} fontSize={11} fill={c.textMute} textAnchor="end">
              {formatMoneyCompact(niceMax * g)}
            </text>
          </g>
        );
      })}
      {months.map((m, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const inc = Number(m.income), exp = Number(m.expenses);
        const hIn  = (inc / niceMax) * innerH;
        const hOut = (exp / niceMax) * innerH;
        return (
          <g key={m.month}>
            <rect x={cx - barW - gap/2} y={padT + innerH - hIn}
              width={barW} height={hIn} fill={INCOME} rx={5} />
            <rect x={cx + gap/2} y={padT + innerH - hOut}
              width={barW} height={hOut} fill={EXPENSE} rx={5} />
            <text x={cx} y={H - padB + 20} fontSize={11} fill={c.textDim} textAnchor="middle">
              {m.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Net savings — area + line + dots ──
function NetSavingsArea({ months, c, accent }) {
  const W = 1080, H = 240;
  const padL = 56, padR = 16, padT = 16, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const vals = months.map(m => Number(m.net));
  const max = Math.max(...vals);
  const niceMax = Math.ceil(max / 10000) * 10000 || 10000;
  const stepX = innerW / (months.length - 1);
  const pts = vals.map((v, i) => ({ x: padL + i * stepX, y: padT + (1 - v/niceMax) * innerH }));
  const pathLine = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const pathArea = pathLine + ` L ${pts[pts.length-1].x.toFixed(1)} ${padT + innerH} L ${pts[0].x.toFixed(1)} ${padT + innerH} Z`;
  const ticks = 4;
  const gid = "netGrad";

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }, (_, i) => i / ticks).map((g, i) => {
        const y = padT + (1 - g) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={c.border} strokeDasharray="3 4" />
            <text x={padL - 8} y={y + 4} fontSize={11} fill={c.textMute} textAnchor="end">
              {formatMoneyCompact(niceMax * g)}
            </text>
          </g>
        );
      })}
      <path d={pathArea} fill={`url(#${gid})`} />
      <path d={pathLine} fill="none" stroke={accent} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill={c.surface} stroke={accent} strokeWidth="2" />
          <text x={p.x} y={H - padB + 20} fontSize={11} fill={c.textDim} textAnchor="middle">
            {months[i].month}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── CashFlow — area income + area expenses + dashed net line ──
function CashFlowChart({ months, c, accent }) {
  const W = 1080, H = 320;
  const padL = 56, padR = 16, padT = 16, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...months.flatMap(m => [Number(m.income), Number(m.expenses), Math.abs(Number(m.net))]));
  const niceMax = Math.ceil(max / 20000) * 20000;
  const stepX = innerW / (months.length - 1);
  const mapPt = (val) => (v, i) => ({ x: padL + i * stepX, y: padT + (1 - v[val]/niceMax) * innerH });
  const inPts = months.map(mapPt("income")).map((p,i) => ({ ...p, y: padT + (1 - Number(months[i].income)/niceMax) * innerH }));
  const exPts = months.map((m, i) => ({ x: padL + i * stepX, y: padT + (1 - Number(m.expenses)/niceMax) * innerH }));
  const netPts = months.map((m, i) => ({ x: padL + i * stepX, y: padT + (1 - Number(m.net)/niceMax) * innerH }));
  const linePath = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = (pts) => linePath(pts) + ` L ${pts[pts.length-1].x.toFixed(1)} ${padT + innerH} L ${pts[0].x.toFixed(1)} ${padT + innerH} Z`;
  const ticks = 4;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="cfIn"  x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INCOME} stopOpacity="0.3" />
          <stop offset="100%" stopColor={INCOME} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cfEx"  x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={EXPENSE} stopOpacity="0.28" />
          <stop offset="100%" stopColor={EXPENSE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }, (_, i) => i / ticks).map((g, i) => {
        const y = padT + (1 - g) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={c.border} strokeDasharray="3 4" />
            <text x={padL - 8} y={y + 4} fontSize={11} fill={c.textMute} textAnchor="end">
              {formatMoneyCompact(niceMax * g)}
            </text>
          </g>
        );
      })}
      <path d={areaPath(inPts)} fill="url(#cfIn)" />
      <path d={linePath(inPts)} fill="none" stroke={INCOME} strokeWidth="2" strokeLinecap="round" />
      <path d={areaPath(exPts)} fill="url(#cfEx)" />
      <path d={linePath(exPts)} fill="none" stroke={EXPENSE} strokeWidth="2" strokeLinecap="round" />
      <path d={linePath(netPts)} fill="none" stroke={accent} strokeWidth="2"
        strokeDasharray="5 5" strokeLinecap="round" />
      {months.map((m, i) => {
        const x = padL + i * stepX;
        return (
          <text key={m.month} x={x} y={H - padB + 20} fontSize={11} fill={c.textDim} textAnchor="middle">
            {m.month}
          </text>
        );
      })}
    </svg>
  );
}

// ── Donut chart (same approach as Dashboard, sized differently) ──
function CategoryDonut({ categories, total, c }) {
  const size = 240, stroke = 28;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const gap = 2;

  return (
    <div style={{ display: "grid", placeItems: "center", padding: "8px 0" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={c.dark ? "#2A2F3F" : "#EFEEE7"} strokeWidth={stroke} />
          {categories.map(cat => {
            const frac = Number(cat.total) / total;
            const len = Math.max(0, C * frac - gap);
            const seg = (
              <circle key={cat.categoryId}
                cx={cx} cy={cy} r={r} fill="none"
                stroke={cat.categoryColor} strokeWidth={stroke}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset} />
            );
            offset += C * frac;
            return seg;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: c.textDim, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Расходы
            </div>
            <div style={{
              fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em",
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

// ── Big paired bars for Reports → Бюджет vs Факт ──
function BudgetVsActualReportChart({ budgets, c, accent }) {
  const W = 1080, H = 320;
  const padL = 56, padR = 16, padT = 16, padB = 64;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...budgets.flatMap(b => [Number(b.amount), Number(b.spent)]));
  const niceMax = Math.ceil(max / 5000) * 5000;
  const ticks = 4;
  const groupW = innerW / budgets.length;
  const barW = Math.min(32, (groupW - 16) / 2);
  const gap = 6;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {Array.from({ length: ticks + 1 }, (_, i) => i / ticks).map((g, i) => {
        const y = padT + (1 - g) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={c.border} strokeDasharray="3 4" />
            <text x={padL - 8} y={y + 4} fontSize={11} fill={c.textMute} textAnchor="end">
              {formatMoneyCompact(niceMax * g)}
            </text>
          </g>
        );
      })}
      {budgets.map((b, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const limit = Number(b.amount), spent = Number(b.spent);
        const hLimit = (limit / niceMax) * innerH;
        const hSpent = (spent / niceMax) * innerH;
        const xLimit = cx - barW - gap / 2;
        const xSpent = cx + gap / 2;
        const isOver = spent > limit;
        return (
          <g key={b.id}>
            <rect x={xLimit} y={padT + innerH - hLimit} width={barW} height={hLimit}
              fill={hexA(accent, 0.35)} rx={5} />
            <rect x={xSpent} y={padT + innerH - hSpent} width={barW} height={hSpent}
              fill={isOver ? EXPENSE : (b.categoryColor || accent)} rx={5} />
            <text x={cx} y={H - padB + 20} fontSize={11} fill={c.textDim}
              textAnchor="middle" style={{ pointerEvents: "none" }}>
              <tspan x={cx}>{trim(b.name, 14)}</tspan>
              <tspan x={cx} dy={14} fontSize={10} fill={c.textMute}>
                {Math.round((spent / Math.max(1, limit)) * 100)}%
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

// ── Legend ──
function Legend({ items, c }) {
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 12, color: c.textDim }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {it.dashed ? (
            <span style={{
              width: 14, height: 0, borderTop: `2px dashed ${it.color}`,
            }} />
          ) : (
            <span style={{ width: 12, height: 12, borderRadius: 3, background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
