// ════════════════════════════════════════════════════════════════════════════
// Бабкосчёт — Budgets (Бюджеты)
// Mirrors frontend/src/pages/Budgets/index.tsx:
//   - Stoplight progress: >=100% red, >=80% yellow, else green (ProgressBar.tsx)
//   - Period: weekly / monthly / yearly
//   - Per-card: name, category, limit, spent, remaining, days, projection
//   - We add: stat strip + section split (active / on track / over) + Budget vs
//     Actual mini-chart so the page is more than a card grid
// ════════════════════════════════════════════════════════════════════════════

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6366F1",
  "cardStyle": "soft",
  "showSpark": true,
  "groupByStatus": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const c = useTheme(t);
  const cl = cardLook(t, c);

  const [month, setMonth] = React.useState({ y: 2026, m: 4 });
  const monthName = MONTHS_RU_LONG[month.m];
  const stepMonth = (d) => setMonth(({ y, m }) => {
    let nm = m + d, ny = y;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11){ nm = 0;  ny++; }
    return { y: ny, m: nm };
  });

  const [period, setPeriod] = React.useState("monthly");
  const filtered = BUDGETS.filter(b => b.period === period);

  // Aggregates (status semantics from frontend/src/components/ui/ProgressBar.tsx)
  const totalLimit  = filtered.reduce((s,b) => s + Number(b.amount), 0);
  const totalSpent  = filtered.reduce((s,b) => s + Number(b.spent),  0);
  const overall     = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const overBudgets = filtered.filter(b => Number(b.spent) >= Number(b.amount));
  const onTrack     = filtered.filter(b => Number(b.spent) <  Number(b.amount) * 0.8);
  const closeBudgets= filtered.filter(b => {
    const s = Number(b.spent), a = Number(b.amount);
    return s >= a * 0.8 && s < a;
  });

  // Group cards by status when toggled on
  const groups = t.groupByStatus
    ? [
        { key: "over",  title: "Превышены",      color: EXPENSE, items: overBudgets },
        { key: "close", title: "Близко к лимиту", color: WARN,    items: closeBudgets },
        { key: "track", title: "В норме",         color: INCOME,  items: onTrack },
      ].filter(g => g.items.length > 0)
    : [{ key: "all", title: null, items: filtered }];

  return (
    <div style={{
      minHeight: "100vh", background: c.bg, color: c.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", letterSpacing: "-0.01em",
    }}>
      <Sidebar activeRoute="/budgets" accent={t.accent} theme={t.theme}
        onThemeToggle={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}
        savings={62660} savingsGoal={SAVINGS_GOAL} />

      <main style={{ flex: 1, padding: "28px 36px 64px", minWidth: 0 }}>
        <TopBar
          greeting={overBudgets.length > 0
            ? `${overBudgets.length} ${overBudgets.length === 1 ? "бюджет превышен" : "бюджета превышены"}`
            : "Все бюджеты под контролем"}
          title="Бюджеты"
          c={c} accent={t.accent}
          month={month} monthName={monthName}
          onPrevMonth={() => stepMonth(-1)} onNextMonth={() => stepMonth(1)}
          primaryLabel="Новый бюджет"
        />

        {/* ════════════ Hero — overall progress + period switch ════════════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 18,
          marginBottom: 18,
        }}>
          {/* Overall card — bigger, with progress dial */}
          <OverallBudgetCard
            limit={totalLimit} spent={totalSpent} count={filtered.length}
            monthName={monthName}
            tint={cl.bg(c.dark ? "#1B1B30" : "#EEEBFB")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={t.accent} c={c} />

          <StatCard label="Активных" value={String(filtered.length)} sub={`из ${BUDGETS.length}`}
            tint={cl.bg(c.dark ? "#1A2230" : "#EEF0FF")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={t.accent} icon={<IconTarget />} c={c}>
            {t.showSpark && <Sparkline color={t.accent} points={[3,3,4,4,5,5,5,6,6,6,7,7]} />}
          </StatCard>

          <StatCard label="В норме" value={String(onTrack.length)} sub="до 80% лимита"
            tint={cl.bg(c.dark ? "#142421" : "#E8F7EE")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={INCOME} valueColor={INCOME} icon={<IconCheck />} c={c}>
            {t.showSpark && <Sparkline color={INCOME} points={[2,3,3,4,4,5,4,5,5,5,5,5]} />}
          </StatCard>

          <StatCard label="Превышены" value={String(overBudgets.length)}
            sub={overBudgets.length ? "требуется внимание" : "всё хорошо"}
            tint={cl.bg(c.dark ? "#2A1A1F" : "#FDECEC")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={EXPENSE} valueColor={EXPENSE} icon={<IconWarn />} c={c}>
            {t.showSpark && <Sparkline color={EXPENSE} points={[0,0,1,0,1,1,1,2,1,2,1,1]} />}
          </StatCard>
        </section>

        {/* ════════════ Period switch + view toggle ════════════ */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
        }}>
          <PillGroup value={period} accent={t.accent} c={c}
            options={[
              { value: "weekly",  label: "Неделя" },
              { value: "monthly", label: "Месяц" },
              { value: "yearly",  label: "Год" },
            ]}
            onChange={setPeriod} />

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: c.textDim }}>Группировать по статусу</span>
            <button onClick={() => setTweak("groupByStatus", !t.groupByStatus)}
              aria-pressed={t.groupByStatus}
              style={{
                width: 36, height: 20, padding: 2, borderRadius: 999,
                background: t.groupByStatus ? t.accent : c.border,
                border: "none", cursor: "pointer", transition: "background 0.15s",
              }}>
              <span style={{
                display: "block", width: 16, height: 16, borderRadius: "50%",
                background: "#fff",
                transform: `translateX(${t.groupByStatus ? 16 : 0}px)`,
                transition: "transform 0.15s",
              }} />
            </button>
          </div>
        </div>

        {/* ════════════ Budget cards, optionally grouped ════════════ */}
        {filtered.length === 0 ? (
          <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
            <EmptyBudgets c={c} accent={t.accent} />
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {groups.map(g => (
              <div key={g.key}>
                {g.title && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", background: g.color,
                    }} />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
                      {g.title}
                    </h3>
                    <span style={{
                      fontSize: 12, color: c.textDim,
                      background: c.surfaceAlt,
                      padding: "2px 8px", borderRadius: 999,
                      border: `1px solid ${c.border}`,
                    }}>{g.items.length}</span>
                  </div>
                )}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  gap: 16,
                }}>
                  {g.items.map(b => (
                    <BudgetCard key={b.id} b={b} c={c} cl={cl} accent={t.accent} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════════════ Budget vs Actual bar chart ════════════ */}
        <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}
              style={{ marginTop: 18 }}>
          <SectionHeader title="Бюджет vs Факт" c={c}
            right={<a href="Reports.html" style={{ fontSize: 13, fontWeight: 500, color: t.accent, textDecoration: "none" }}>Подробнее в отчётах →</a>} />
          <BudgetVsActualChart budgets={filtered} c={c} accent={t.accent} />
        </Card>
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
          <TweakToggle label="Группировка по статусу" value={t.groupByStatus}
            onChange={v => setTweak("groupByStatus", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Overall budget card — donut dial + spent / limit / remaining
// ────────────────────────────────────────────────────────────────────────────
function OverallBudgetCard({ limit, spent, count, monthName, tint, radius, border, shadow, accent, c }) {
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const remaining = limit - spent;
  const status = pct >= 100 ? EXPENSE : pct >= 80 ? WARN : INCOME;
  const size = 92, stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = (pct / 100) * C;

  return (
    <div style={{
      background: tint, borderRadius: radius,
      border: border || "none", boxShadow: shadow || "none",
      padding: 20, display: "flex", flexDirection: "column", gap: 14,
      minHeight: 148, position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: hexA(accent, c.dark ? 0.22 : 0.14),
          color: accent, display: "grid", placeItems: "center",
        }}><IconTarget /></div>
        <div>
          <div style={{ fontSize: 13, color: c.textDim, fontWeight: 500 }}>
            Общий бюджет
          </div>
          <div style={{ fontSize: 11, color: c.textMute }}>
            {count} активных · {monthName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: "auto" }}>
        {/* Dial */}
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size/2} cy={size/2} r={r}
              fill="none" stroke={hexA(status, 0.18)} strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r}
              fill="none" stroke={status} strokeWidth={stroke}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeLinecap="round" />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "grid", placeItems: "center",
            fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: status,
          }}>{pct}%</div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatMoney(spent)}
          </div>
          <div style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
            из {formatMoney(limit)}
          </div>
          <div style={{
            fontSize: 12, marginTop: 6, fontWeight: 500,
            color: remaining >= 0 ? c.text : EXPENSE,
            fontVariantNumeric: "tabular-nums",
          }}>
            {remaining >= 0
              ? <>Остаток <span style={{ color: c.text }}>{formatMoney(remaining)}</span></>
              : <>Перерасход {formatMoney(-remaining)}</>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Budget card — one per budget, with daily-rate projection
// ────────────────────────────────────────────────────────────────────────────
function BudgetCard({ b, c, cl, accent }) {
  const spent = Number(b.spent);
  const limit = Number(b.amount);
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const remaining = limit - spent;

  // Stoplight semantics from real ProgressBar.tsx
  const status = pct >= 100 ? "error" : pct >= 80 ? "warning" : "success";
  const statusColor = { success: INCOME, warning: WARN, error: EXPENSE }[status];
  const statusLabel = { success: "В норме", warning: "Близко", error: "Превышен" }[status];

  // Days remaining + projection (matches budget page logic)
  const today = new Date("2026-05-18");
  const periodEnd = b.endDate
    ? new Date(b.endDate)
    : b.period === "monthly"
      ? new Date(today.getFullYear(), today.getMonth() + 1, 0)
      : b.period === "weekly"
        ? new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(today.getFullYear(), 11, 31);
  const daysLeft = Math.max(0, Math.round((periodEnd - today) / (1000 * 60 * 60 * 24)));
  const start = new Date(b.startDate);
  const daysIn = Math.max(1, Math.round((today - start) / (1000 * 60 * 60 * 24)));
  const dailyRate = spent / daysIn;
  const projected = daysLeft > 0 ? spent + dailyRate * daysLeft : spent;

  const periodLabel = { weekly: "Неделя", monthly: "Месяц", yearly: "Год" }[b.period];

  return (
    <div style={{
      background: cl.bg(c.surface),
      borderRadius: cl.radius,
      border: cl.border || `1px solid ${c.border}`,
      boxShadow: cl.shadow || "none",
      padding: 18,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: hexA(b.categoryColor, 0.14),
          color: b.categoryColor,
          display: "grid", placeItems: "center",
          fontWeight: 600, fontSize: 15, flexShrink: 0,
        }}>{initialOf(b.name)}</div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{b.name}</div>
          <div style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
            {b.categoryName || "Все категории"} · {periodLabel}
          </div>
        </div>

        <span style={{
          fontSize: 11, fontWeight: 500,
          padding: "3px 9px", borderRadius: 999,
          background: hexA(statusColor, 0.14), color: statusColor,
          flexShrink: 0,
        }}>{statusLabel}</span>
      </div>

      {/* Numbers */}
      <div>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}>{formatMoney(spent, b.currency)}</span>
          <span style={{
            fontSize: 12, color: c.textDim,
            fontVariantNumeric: "tabular-nums",
          }}>из {formatMoney(limit, b.currency)}</span>
        </div>

        {/* Progress bar with goal-line marker at 100% */}
        <div style={{
          position: "relative",
          height: 8, borderRadius: 999,
          background: c.dark ? "#262A3A" : "#EFEEE7",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${Math.min(100, pct)}%`, height: "100%",
            background: statusColor, borderRadius: 999,
            transition: "width 0.5s ease",
          }} />
          {pct > 100 && (
            <div style={{
              position: "absolute", top: 0, height: "100%",
              left: 0, width: "100%",
              backgroundImage: `repeating-linear-gradient(45deg, ${hexA(EXPENSE,0.25)} 0 4px, transparent 4px 8px)`,
              borderRadius: 999, pointerEvents: "none",
            }} />
          )}
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 8, fontSize: 12,
          fontVariantNumeric: "tabular-nums",
        }}>
          <span style={{ color: statusColor, fontWeight: 500 }}>{pct}% использовано</span>
          <span style={{ color: c.textDim }}>
            {remaining >= 0 ? `Остаток ${formatMoney(remaining, b.currency)}` : "Лимит превышен"}
          </span>
        </div>
      </div>

      {/* Footer: days + projection */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        paddingTop: 12, borderTop: `1px solid ${c.border}`,
      }}>
        <div>
          <div style={{ fontSize: 11, color: c.textMute, marginBottom: 2 }}>Осталось дней</div>
          <div style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {daysLeft || "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: c.textMute, marginBottom: 2 }}>Прогноз к концу</div>
          <div style={{
            fontSize: 14, fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            color: projected > limit ? EXPENSE : c.text,
          }}>{formatMoney(projected, b.currency)}</div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Budget vs Actual chart — paired bars
// ────────────────────────────────────────────────────────────────────────────
function BudgetVsActualChart({ budgets, c, accent }) {
  if (budgets.length === 0) return null;

  const W = 1080, H = 280;
  const padL = 56, padR = 16, padT = 16, padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...budgets.flatMap(b => [Number(b.amount), Number(b.spent)]));
  // round up to a nice number
  const niceMax = Math.ceil(max / 5000) * 5000;
  const ticks = 4;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => i / ticks);

  const groupW = innerW / budgets.length;
  const barW = Math.min(28, (groupW - 16) / 2);
  const gap = 6;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%" }}>
        {/* Grid */}
        {gridY.map((g, i) => {
          const y = padT + (1 - g) * innerH;
          const value = niceMax * g;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y}
                stroke={c.border} strokeDasharray="3 4" />
              <text x={padL - 8} y={y + 4} fontSize={11} fill={c.textMute} textAnchor="end">
                {formatMoneyCompact(value)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
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
              {/* Limit bar (accent at low opacity) */}
              <rect x={xLimit} y={padT + innerH - hLimit} width={barW} height={hLimit}
                fill={hexA(accent, 0.25)} rx={4} />
              {/* Spent bar (status color) */}
              <rect x={xSpent} y={padT + innerH - hSpent} width={barW} height={hSpent}
                fill={isOver ? EXPENSE : b.categoryColor || accent} rx={4} />
              {/* Label */}
              <text x={cx} y={H - padB + 18} fontSize={11} fill={c.textDim} textAnchor="middle">
                {truncate(b.name, 12)}
              </text>
              <text x={cx} y={H - padB + 34} fontSize={10} fill={c.textMute} textAnchor="middle">
                {Math.round((spent / Math.max(1, limit)) * 100)}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 18, justifyContent: "center",
        fontSize: 12, color: c.textDim, marginTop: 4,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: hexA(accent, 0.25) }} />
          Лимит
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: accent }} />
          Фактически
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: EXPENSE }} />
          Превышение
        </span>
      </div>
    </div>
  );
}

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

// ────────────────────────────────────────────────────────────────────────────
function EmptyBudgets({ c, accent }) {
  return (
    <div style={{
      padding: "48px 24px", textAlign: "center", color: c.textDim,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: c.text, marginBottom: 4 }}>
        Бюджеты ещё не созданы
      </div>
      <div style={{ fontSize: 13, marginBottom: 18 }}>
        Создайте первый бюджет, чтобы контролировать расходы по категориям
      </div>
      <button style={{
        background: accent, color: "#fff",
        border: "none", cursor: "pointer",
        padding: "10px 18px", borderRadius: 10,
        fontSize: 14, fontWeight: 500,
        boxShadow: `0 6px 16px -8px ${accent}`,
      }}>
        Создать бюджет
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
