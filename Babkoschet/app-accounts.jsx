// ════════════════════════════════════════════════════════════════════════════
// Бабкосчёт — Счета (Accounts)
// Mirrors frontend/src/pages/Accounts/index.tsx:
//   - useAccounts → ACCOUNTS list with type / currency / balance / color / icon
//   - Create/Edit/Delete modals (here: side rail for the selected account)
// Hi-fi extension on top of the real spartan grid:
//   - Stat strip (total balance, foreign value, by type, monthly net)
//   - Master-detail with sparkline + this month in/out + recent ops
//   - Allocation donut by type
//   - Quick transfer form (between own accounts)
// ════════════════════════════════════════════════════════════════════════════

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6366F1",
  "cardStyle": "soft",
  "showSpark": true,
  "hideBalances": false
}/*EDITMODE-END*/;

// Type labels — aligned with real ACCOUNT_TYPES in pages/Accounts/index.tsx
const TYPE_LABEL = {
  card: "Карта", checking: "Текущий счёт", savings: "Накопительный",
  credit_card: "Кредитная карта", cash: "Наличные",
  investment: "Инвестиции", loan: "Кредит", wallet: "Кошелёк",
};
const TYPE_ICON = {
  card: "💳", checking: "🏦", savings: "🐖", credit_card: "💳",
  cash: "💵", investment: "📈", loan: "📉", wallet: "👛",
};
const CURRENCY_RATES_RUB = { RUB: 1, USD: 92, EUR: 100 }; // demo rates for total

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

  const [selectedId, setSelectedId] = React.useState(ACCOUNTS[0].id);
  const selected = ACCOUNTS.find(a => a.id === selectedId) || ACCOUNTS[0];

  // ── Per-account derived stats from TRANSACTIONS ─────────────────────────
  const accountStats = React.useMemo(() => {
    const stats = {};
    for (const acc of ACCOUNTS) {
      const txs = TRANSACTIONS.filter(x => x.accountId === acc.id);
      const inSum  = txs.filter(x => x.type === "credit").reduce((s,x)=>s+Number(x.amount), 0);
      const outSum = txs.filter(x => x.type === "debit") .reduce((s,x)=>s+Number(x.amount), 0);
      const txCount = txs.length;
      const last = txs.length ? txs[0].date : null;
      // Synthetic 12-point trend — current balance is the right edge, drift backward
      const cur = Number(acc.balance);
      const pts = [];
      let v = cur;
      for (let i = 11; i >= 0; i--) {
        // walk backwards a deterministic amount based on accountId hash + idx
        const seed = (acc.id.charCodeAt(1) * 13 + i * 7) % 9;
        const drift = (i + 1) * (cur * 0.012) * ((seed % 5) - 2) / 4;
        v = v - drift;
        pts.unshift(Math.max(cur * 0.55, v));
      }
      stats[acc.id] = { inSum, outSum, txCount, last, points: pts, txs };
    }
    return stats;
  }, []);

  // ── Top-strip totals ────────────────────────────────────────────────────
  const totalRub = ACCOUNTS
    .reduce((s, a) => s + Number(a.balance) * (CURRENCY_RATES_RUB[a.currency] || 1), 0);
  const totalForeign = ACCOUNTS
    .filter(a => a.currency !== "RUB")
    .reduce((s, a) => s + Number(a.balance) * (CURRENCY_RATES_RUB[a.currency] || 1), 0);
  const totalSavings = ACCOUNTS
    .filter(a => a.type === "savings")
    .reduce((s, a) => s + Number(a.balance), 0);
  const monthIn  = TRANSACTIONS.filter(x => x.type === "credit" && x.currency === "RUB").reduce((s,x)=>s+Number(x.amount), 0);
  const monthOut = TRANSACTIONS.filter(x => x.type === "debit"  && x.currency === "RUB").reduce((s,x)=>s+Number(x.amount), 0);
  const monthNet = monthIn - monthOut;

  // ── Allocation by type (share of total balance, in RUB-equivalent) ──────
  const byType = React.useMemo(() => {
    const m = new Map();
    for (const acc of ACCOUNTS) {
      const val = Number(acc.balance) * (CURRENCY_RATES_RUB[acc.currency] || 1);
      m.set(acc.type, (m.get(acc.type) || 0) + val);
    }
    const arr = Array.from(m.entries()).map(([type, total]) => ({
      type, label: TYPE_LABEL[type] || type, total,
      color: ACCOUNTS.find(a => a.type === type).color,
      pct: total / totalRub * 100,
    }));
    arr.sort((a,b) => b.total - a.total);
    return arr;
  }, [totalRub]);

  // ── Quick transfer state ────────────────────────────────────────────────
  const [xferFrom, setXferFrom] = React.useState(ACCOUNTS[0].id);
  const [xferTo,   setXferTo]   = React.useState(ACCOUNTS[3].id);
  const [xferAmount, setXferAmount] = React.useState("");

  const fmt = (v, cur = "RUB") => t.hideBalances ? "••••••" : formatMoney(v, cur);

  return (
    <div style={{
      minHeight: "100vh", background: c.bg, color: c.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", letterSpacing: "-0.01em",
    }}>
      <Sidebar activeRoute="/accounts" accent={t.accent} theme={t.theme}
        onThemeToggle={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}
        savings={62660} savingsGoal={SAVINGS_GOAL} />

      <main style={{ flex: 1, padding: "28px 36px 64px", minWidth: 0 }}>
        <TopBar
          greeting={`${ACCOUNTS.length} активных счёта в ${monthName.toLowerCase()}`}
          title="Счета"
          c={c} accent={t.accent}
          month={month} monthName={monthName}
          onPrevMonth={() => stepMonth(-1)} onNextMonth={() => stepMonth(1)}
          primaryLabel="Новый счёт"
        />

        {/* ════════════ Stat strip ════════════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18,
          marginBottom: 18,
        }}>
          <StatCard label="Общий баланс" value={fmt(Math.round(totalRub))}
            sub={`${ACCOUNTS.length} счетов · ${ACCOUNTS.filter(a=>a.currency!=="RUB").length} в валюте`}
            tint={cl.bg(c.dark ? "#1A2230" : "#EEF0FF")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={t.accent} icon={<IconWallet />} c={c}>
            {t.showSpark && <Sparkline color={t.accent} points={[180,210,230,260,290,320,330,340,348,352,358,362]} />}
          </StatCard>
          <StatCard label="В иностранной валюте" value={fmt(Math.round(totalForeign))}
            sub={ACCOUNTS.filter(a=>a.currency!=="RUB").map(a=>`${formatMoney(a.balance, a.currency)}`).join(" · ")}
            tint={cl.bg(c.dark ? "#142421" : "#E8F7EE")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={INCOME} icon={<IconArrowDown />} c={c} />
          <StatCard label="Накопления" value={fmt(totalSavings)}
            sub={`цель ${formatMoney(SAVINGS_GOAL)}`}
            tint={cl.bg(c.dark ? "#1B1B30" : "#EEEBFB")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={t.accent} valueColor={t.accent} icon={<IconPig />}
            progress={totalSavings / SAVINGS_GOAL} c={c} />
          <StatCard label="Чистый поток" value={`${monthNet>=0?"+":"−"}${fmt(Math.abs(monthNet))}`}
            sub={`+${formatMoney(monthIn)} / −${formatMoney(monthOut)}`}
            tint={cl.bg(c.dark ? "#2A1A1F" : monthNet >= 0 ? "#E8F7EE" : "#FDECEC")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={monthNet >= 0 ? INCOME : EXPENSE}
            valueColor={monthNet >= 0 ? INCOME : EXPENSE}
            icon={monthNet >= 0 ? <IconArrowDown /> : <IconArrowUp />} c={c}>
            {t.showSpark && <Sparkline color={monthNet >= 0 ? INCOME : EXPENSE}
              points={[20,25,22,30,28,35,40,38,45,42,50,55]} />}
          </StatCard>
        </section>

        {/* ════════════ Row 2: Account list (master) + Detail (sticky) ════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr 380px",
          gap: 18, alignItems: "start", marginBottom: 18,
        }}>
          {/* ── Accounts grid */}
          <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow} pad={0}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "20px 24px 12px",
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Мои счета
              </h2>
              <span style={{
                fontSize: 12, color: c.textDim,
                background: c.surfaceAlt, padding: "3px 10px", borderRadius: 999,
                border: `1px solid ${c.border}`,
              }}>{ACCOUNTS.length}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setTweak("hideBalances", !t.hideBalances)} style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 13, color: c.textDim, fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  {t.hideBalances ? <IconEye /> : <IconEyeOff />}
                  {t.hideBalances ? "Показать" : "Скрыть"}
                </button>
              </div>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
              gap: 14, padding: "0 22px 22px",
            }}>
              {ACCOUNTS.map(acc => (
                <BigAccountCard key={acc.id} acc={acc} c={c} accent={t.accent}
                  selected={acc.id === selectedId} onClick={() => setSelectedId(acc.id)}
                  stats={accountStats[acc.id]} hide={t.hideBalances} showSpark={t.showSpark} />
              ))}
              <AddAccountTile c={c} accent={t.accent} />
            </div>
          </Card>

          {/* ── Detail rail */}
          <AccountDetailPanel
            acc={selected} stats={accountStats[selected.id]}
            c={c} cl={cl} accent={t.accent} hide={t.hideBalances}
            monthName={monthName} showSpark={t.showSpark}
          />
        </section>

        {/* ════════════ Row 3: Allocation + Quick transfer ════════════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 18, alignItems: "start", marginBottom: 18,
        }}>
          {/* Allocation */}
          <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
            <SectionHeader title="Распределение по типам" c={c}
              right={<span style={{ fontSize: 12, color: c.textDim }}>в ₽-эквиваленте</span>} />
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "center" }}>
              <AllocationDonut items={byType} c={c} totalRub={totalRub} hide={t.hideBalances} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {byType.map(b => (
                  <li key={b.type} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 3,
                      background: b.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.label}
                    </span>
                    <span style={{
                      fontSize: 12, color: c.textDim,
                      fontVariantNumeric: "tabular-nums",
                      width: 44, textAlign: "right",
                    }}>{b.pct.toFixed(1)}%</span>
                    <span style={{
                      fontSize: 14, fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                      width: 110, textAlign: "right", whiteSpace: "nowrap",
                    }}>{fmt(Math.round(b.total))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Quick transfer */}
          <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}>
            <SectionHeader title="Быстрый перевод" c={c}
              right={<span style={{ fontSize: 12, color: c.textDim }}>между своими счетами</span>} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", gap: 10, alignItems: "end", marginBottom: 14 }}>
              <Field label="Откуда" c={c}>
                <AccountSelect accounts={ACCOUNTS} value={xferFrom} onChange={setXferFrom} c={c} hide={t.hideBalances} />
              </Field>
              <div style={{ display: "grid", placeItems: "center", paddingBottom: 8, color: c.textDim }}>
                <button onClick={() => { const a = xferFrom; setXferFrom(xferTo); setXferTo(a); }}
                  style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: c.surfaceAlt, border: `1px solid ${c.border}`,
                    color: c.text, cursor: "pointer",
                    display: "grid", placeItems: "center",
                  }}>
                  <IconTransfer />
                </button>
              </div>
              <Field label="Куда" c={c}>
                <AccountSelect accounts={ACCOUNTS} value={xferTo} onChange={setXferTo} c={c} hide={t.hideBalances} />
              </Field>
            </div>

            <Field label="Сумма" c={c}>
              <div style={{
                display: "flex", alignItems: "center",
                padding: "0 14px", height: 44,
                background: c.surfaceAlt, border: `1px solid ${c.border}`,
                borderRadius: 12,
              }}>
                <input value={xferAmount} onChange={e => setXferAmount(e.target.value)}
                  placeholder="0"
                  type="text"
                  inputMode="decimal"
                  style={{
                    flex: 1, minWidth: 0, border: "none", outline: "none",
                    background: "transparent", color: c.text,
                    fontSize: 22, fontWeight: 600, fontFamily: "inherit",
                    letterSpacing: "-0.01em",
                    fontVariantNumeric: "tabular-nums",
                  }} />
                <span style={{ color: c.textDim, fontSize: 16, fontWeight: 500 }}>
                  {ACCOUNTS.find(a => a.id === xferFrom)?.currency || "RUB"}
                </span>
              </div>
            </Field>

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {[1000, 5000, 10000, 25000].map(v => (
                <button key={v} onClick={() => setXferAmount(String(v))} style={{
                  padding: "6px 12px", borderRadius: 999,
                  background: "transparent", border: `1px solid ${c.border}`,
                  color: c.textDim, cursor: "pointer",
                  fontSize: 12, fontFamily: "inherit",
                }}>
                  + {formatMoneyCompact(v)}
                </button>
              ))}
            </div>

            <button style={{
              marginTop: 16, width: "100%",
              padding: "12px 16px", borderRadius: 12,
              background: t.accent, color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: `0 6px 16px -8px ${t.accent}`,
            }}>
              <IconTransfer /> Перевести
            </button>
          </Card>
        </section>

        {/* ════════════ Row 4: Recent transfers ════════════ */}
        <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow} pad={0}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "20px 24px 16px",
          }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Переводы между счетами
            </h2>
            <span style={{
              fontSize: 12, color: c.textDim,
              background: c.surfaceAlt, padding: "3px 10px", borderRadius: 999,
              border: `1px solid ${c.border}`,
            }}>{TRANSACTIONS.filter(x => x.type === "transfer").length}</span>
            <a href="Operations.html" style={{
              marginLeft: "auto", fontSize: 13, fontWeight: 500,
              color: t.accent, textDecoration: "none",
            }}>Все операции →</a>
          </div>
          <TransferList txs={TRANSACTIONS.filter(x => x.type === "transfer")} c={c} accent={t.accent} hide={t.hideBalances} />
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
          <TweakToggle label="Скрыть суммы" value={t.hideBalances}
            onChange={v => setTweak("hideBalances", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Big account card — main object on the grid
// ────────────────────────────────────────────────────────────────────────────
function BigAccountCard({ acc, c, accent, selected, onClick, stats, hide, showSpark }) {
  const [hover, setHover] = React.useState(false);
  const bg = acc.color || "#3B82F6";
  const typeLabel = TYPE_LABEL[acc.type] || acc.type;
  const last4 = "•• " + (1234 + acc.id.charCodeAt(1) * 17 % 9000).toString().slice(-4);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left", cursor: "pointer",
        padding: 0, border: "none", background: "transparent",
        position: "relative", borderRadius: 16,
        outline: selected ? `2px solid ${accent}` : "2px solid transparent",
        outlineOffset: 2,
        transition: "transform 0.16s ease, outline-color 0.16s ease",
        transform: hover && !selected ? "translateY(-2px)" : "translateY(0)",
      }}>
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: 16,
        padding: "18px 18px 14px",
        background: `linear-gradient(150deg, ${bg}, ${shade(bg, -22)})`,
        color: "#fff",
        boxShadow: c.dark ? "none" : `0 12px 28px -18px ${hexA(bg, 0.7)}`,
      }}>
        <div style={{
          position: "absolute", top: -28, right: -28,
          width: 130, height: 130, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -10,
          width: 110, height: 110, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }} />

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 28, position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.16)",
              display: "grid", placeItems: "center", fontSize: 16, lineHeight: 1,
            }}>{acc.icon || TYPE_ICON[acc.type] || "🏦"}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{acc.name}</div>
              <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: "0.04em",
                textTransform: "uppercase", marginTop: 2 }}>
                {typeLabel} · {acc.currency}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 11, opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
            {last4}
          </span>
        </div>

        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2, position: "relative" }}>Доступно</div>
        <div style={{
          fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums", position: "relative",
        }}>
          {hide ? "••••••" : formatMoney(acc.balance, acc.currency)}
        </div>
      </div>

      <div style={{
        padding: "12px 16px 14px",
        background: c.surface, border: `1px solid ${c.border}`,
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
        marginTop: -8,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: c.textMute, marginBottom: 2 }}>
            За {MONTHS_RU_LONG[4].toLowerCase()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontVariantNumeric: "tabular-nums" }}>
            {stats.inSum > 0 && (
              <span style={{ fontSize: 13, color: INCOME, fontWeight: 500 }}>
                +{formatMoneyCompact(stats.inSum, acc.currency)}
              </span>
            )}
            {stats.outSum > 0 && (
              <span style={{ fontSize: 13, color: EXPENSE, fontWeight: 500 }}>
                −{formatMoneyCompact(stats.outSum, acc.currency)}
              </span>
            )}
            {stats.txCount === 0 && (
              <span style={{ fontSize: 12, color: c.textDim }}>Без активности</span>
            )}
          </div>
        </div>
        {showSpark && stats.txCount > 0 && (
          <Sparkline color={acc.color} points={stats.points} w={70} h={26} />
        )}
      </div>
    </button>
  );
}

function AddAccountTile({ c, accent }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minHeight: 198, borderRadius: 16,
        background: hover ? c.surfaceAlt : "transparent",
        border: `2px dashed ${c.border}`,
        color: c.textDim, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 10, fontFamily: "inherit",
      }}>
      <span style={{
        width: 44, height: 44, borderRadius: 14,
        background: hexA(accent, 0.14), color: accent,
        display: "grid", placeItems: "center",
        fontSize: 24, lineHeight: 1,
      }}>+</span>
      <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>Добавить счёт</div>
      <div style={{ fontSize: 12 }}>Карта, наличные, накопления…</div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Detail panel
// ────────────────────────────────────────────────────────────────────────────
function AccountDetailPanel({ acc, stats, c, cl, accent, hide, monthName, showSpark }) {
  const bg = acc.color;
  return (
    <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}
          pad={0} style={{ position: "sticky", top: 28 }}>
      <div style={{
        padding: "20px 20px 22px",
        borderRadius: `${cl.radius}px ${cl.radius}px 0 0`,
        background: `linear-gradient(160deg, ${hexA(bg, 0.14)}, ${hexA(bg, 0.02)})`,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: hexA(bg, 0.20), color: bg,
            display: "grid", placeItems: "center", fontSize: 18, lineHeight: 1,
          }}>{acc.icon || TYPE_ICON[acc.type] || "🏦"}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{acc.name}</div>
            <div style={{ fontSize: 12, color: c.textDim }}>
              {TYPE_LABEL[acc.type] || acc.type} · {acc.currency}
            </div>
          </div>
          <IconBtnSmall c={c}><IconEdit /></IconBtnSmall>
          <IconBtnSmall c={c}><IconDots /></IconBtnSmall>
        </div>

        <div style={{ fontSize: 12, color: c.textDim, marginBottom: 4,
          letterSpacing: "0.04em", textTransform: "uppercase" }}>Текущий баланс</div>
        <div style={{
          fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          color: Number(acc.balance) < 0 ? EXPENSE : c.text,
        }}>
          {hide ? "••••••" : formatMoney(acc.balance, acc.currency)}
        </div>
        {showSpark && (
          <div style={{ marginTop: 12 }}>
            <Sparkline color={bg} points={stats.points} w={320} h={56} />
          </div>
        )}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <MiniStat label={`Поступило в ${monthName.toLowerCase()}`}
          value={hide ? "••••" : `+${formatMoney(stats.inSum, acc.currency)}`}
          color={INCOME} c={c} />
        <MiniStat label={`Списано в ${monthName.toLowerCase()}`}
          value={hide ? "••••" : `−${formatMoney(stats.outSum, acc.currency)}`}
          color={EXPENSE} c={c} divider />
      </div>

      <div style={{ padding: "18px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Последние операции</span>
          <span style={{ fontSize: 12, color: c.textDim, marginLeft: "auto" }}>
            {stats.txCount} всего
          </span>
        </div>
        {stats.txs.length === 0 ? (
          <div style={{ padding: "16px 0", textAlign: "center", color: c.textDim, fontSize: 13 }}>
            Без операций за период
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginLeft: -8, marginRight: -8 }}>
            {stats.txs.slice(0, 5).map(tx => (
              <MiniTxRow key={tx.id} tx={tx} c={c} accent={accent} hide={hide} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 20px 20px" }}>
        <button style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "transparent", border: `1px solid ${c.border}`,
          color: c.text, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          fontWeight: 500,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <IconPlus /> Пополнить
        </button>
        <button style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "transparent", border: `1px solid ${c.border}`,
          color: c.text, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          fontWeight: 500,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <IconTransfer /> Перевести
        </button>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, color, c, divider }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderLeft: divider ? `1px solid ${c.border}` : "none",
    }}>
      <div style={{ fontSize: 11, color: c.textDim, marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 600, color,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
    </div>
  );
}

function MiniTxRow({ tx, c, accent, hide }) {
  const isIn = tx.type === "credit";
  const isTransfer = tx.type === "transfer";
  const color = tx.categoryColor || (isTransfer ? accent : c.textDim);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px",
      borderRadius: 8,
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: 9,
        background: hexA(color, 0.14), color,
        display: "grid", placeItems: "center",
        fontSize: 12, fontWeight: 600,
      }}>
        {isTransfer ? <IconTransfer /> : initialOf(tx.categoryName || tx.merchant)}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.merchant || tx.description || "Операция"}
        </div>
        <div style={{ fontSize: 11, color: c.textDim }}>{formatDate(tx.date)}</div>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: isIn ? INCOME : isTransfer ? accent : c.text,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}>
        {hide ? "•••" : <>{isIn ? "+" : isTransfer ? "" : "−"}{formatMoneyCompact(tx.amount, tx.currency)}</>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Allocation donut
// ────────────────────────────────────────────────────────────────────────────
function AllocationDonut({ items, c, totalRub, hide }) {
  const size = 200, stroke = 24;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const gap = 2;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
           style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={c.dark ? "#2A2F3F" : "#EFEEE7"} strokeWidth={stroke} />
        {items.map(b => {
          const frac = b.total / totalRub;
          const len = Math.max(0, C * frac - gap);
          const dash = `${len} ${C - len}`;
          const seg = (
            <circle key={b.type}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={b.color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
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
            fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}>{hide ? "••••••" : formatMoneyCompact(totalRub)}</div>
          <div style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>
            {items.length} типов
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Quick transfer — field + account select with balance preview
// ────────────────────────────────────────────────────────────────────────────
function Field({ label, c, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, color: c.textDim, marginBottom: 6,
        letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}>{label}</div>
      {children}
    </label>
  );
}

function AccountSelect({ accounts, value, onChange, c, hide }) {
  const acc = accounts.find(a => a.id === value) || accounts[0];
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", height: 56,
        background: c.surfaceAlt, border: `1px solid ${c.border}`,
        borderRadius: 12, cursor: "pointer", color: c.text,
        fontFamily: "inherit", textAlign: "left",
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: 9,
          background: `linear-gradient(135deg, ${acc.color}, ${shade(acc.color, -22)})`,
          display: "grid", placeItems: "center", color: "#fff",
          fontSize: 14, lineHeight: 1, flexShrink: 0,
        }}>{acc.icon || TYPE_ICON[acc.type] || "🏦"}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {acc.name}
          </div>
          <div style={{ fontSize: 11, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
            {hide ? "••••••" : formatMoney(acc.balance, acc.currency)}
          </div>
        </div>
        <span style={{ color: c.textDim }}><Chevron dir="down" /></span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: 12, boxShadow: c.dark ? "none" : "0 12px 32px -16px rgba(15,17,23,0.18)",
          zIndex: 10, padding: 4, maxHeight: 320, overflowY: "auto",
        }}>
          {accounts.map(a => (
            <button key={a.id} onClick={() => { onChange(a.id); setOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              background: a.id === value ? c.surfaceAlt : "transparent",
              border: "none", cursor: "pointer", color: c.text,
              fontFamily: "inherit", textAlign: "left",
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8,
                background: `linear-gradient(135deg, ${a.color}, ${shade(a.color, -22)})`,
                display: "grid", placeItems: "center", color: "#fff",
                fontSize: 12, lineHeight: 1, flexShrink: 0,
              }}>{a.icon || TYPE_ICON[a.type] || "🏦"}</span>
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
              <span style={{ fontSize: 12, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
                {hide ? "••••" : formatMoneyCompact(a.balance, a.currency)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Transfer list — bottom row
// ────────────────────────────────────────────────────────────────────────────
function TransferList({ txs, c, accent, hide }) {
  if (txs.length === 0) {
    return (
      <div style={{
        padding: "40px 24px", textAlign: "center", color: c.textDim,
        borderTop: `1px solid ${c.border}`,
      }}>
        <div style={{ fontSize: 14, marginBottom: 4, color: c.text, fontWeight: 500 }}>
          Переводов между счетами пока нет
        </div>
        <div style={{ fontSize: 12 }}>
          Используйте форму выше, чтобы переместить деньги между своими счетами
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "44px 1fr 220px 160px 28px",
        gap: 16, padding: "10px 24px",
        background: c.surfaceAlt,
        borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`,
        fontSize: 11, color: c.textMute, fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <span></span>
        <span>Описание</span>
        <span>Маршрут</span>
        <span style={{ textAlign: "right" }}>Сумма</span>
        <span></span>
      </div>
      {txs.map(tx => (
        <div key={tx.id} style={{
          display: "grid", gridTemplateColumns: "44px 1fr 220px 160px 28px",
          gap: 16, alignItems: "center",
          padding: "14px 24px",
          borderTop: `1px solid ${c.border}`,
        }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: hexA(accent, 0.14), color: accent,
            display: "grid", placeItems: "center",
          }}>
            <IconTransfer />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {tx.merchant || "Перевод"}
            </div>
            <div style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
              {tx.description} · {formatDate(tx.date)}
            </div>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            fontSize: 12, color: c.textDim,
          }}>
            {tx.accountName?.split("→").map((part, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ color: c.text, fontWeight: 500 }}>{part.trim()}</span>
                {i < arr.length - 1 && <span style={{ color: accent }}>→</span>}
              </React.Fragment>
            ))}
          </div>
          <div style={{
            textAlign: "right",
            fontSize: 14, fontWeight: 600, color: accent,
            fontVariantNumeric: "tabular-nums",
          }}>
            {hide ? "•••" : formatMoney(tx.amount, tx.currency)}
          </div>
          <IconBtnSmall c={c}><IconDots /></IconBtnSmall>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Eye icons (local — not in shell)
// ────────────────────────────────────────────────────────────────────────────
function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-3.2 3.8" />
      <path d="M6.2 7.4A17.4 17.4 0 0 0 2 12s3.5 6 10 6c1.6 0 3-.3 4.2-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
