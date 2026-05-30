// ════════════════════════════════════════════════════════════════════════════
// Бабкосчёт — Operations (Операции)
// Mirrors frontend/src/pages/Transactions/index.tsx:
//   - Date range + type + account + category + search filters
//   - Grouped-by-day transaction list (real codebase uses flat list; we add
//     date headers so a 1440 desktop feels less like a CSV dump)
//   - Side panel for transaction detail (open on row click)
// ════════════════════════════════════════════════════════════════════════════

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6366F1",
  "cardStyle": "soft",
  "showSpark": true,
  "groupByDate": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const c = useTheme(t);
  const cl = cardLook(t, c);

  // Filters
  const [fromDate, setFromDate] = React.useState("2026-05-01");
  const [toDate,   setToDate]   = React.useState("2026-05-31");
  const [txType,   setTxType]   = React.useState("");
  const [accountId,  setAccountId]  = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [search,   setSearch]   = React.useState("");

  // Detail slide-over
  const [detailTx, setDetailTx] = React.useState(null);

  // Month for context
  const [month, setMonth] = React.useState({ y: 2026, m: 4 });
  const monthName = MONTHS_RU_LONG[month.m];

  // ── Apply filters
  const filtered = React.useMemo(() => {
    return TRANSACTIONS.filter(tx => {
      if (fromDate && tx.date < fromDate) return false;
      if (toDate   && tx.date > toDate)   return false;
      if (txType   && tx.type !== txType) return false;
      if (accountId && tx.accountId !== accountId) return false;
      if (categoryId && tx.categoryId !== categoryId) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${tx.merchant ?? ""} ${tx.description ?? ""} ${tx.categoryName ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [fromDate, toDate, txType, accountId, categoryId, search]);

  // Group by date for the grouped view (deterministic, newest first)
  const groups = React.useMemo(() => {
    const byDate = {};
    for (const tx of filtered) (byDate[tx.date] = byDate[tx.date] || []).push(tx);
    return Object.keys(byDate).sort((a,b) => b.localeCompare(a)).map(d => ({ date: d, txs: byDate[d] }));
  }, [filtered]);

  // Summary derived from the filtered set (RUB only — same as real Dashboard)
  const rub = filtered.filter(x => x.currency === "RUB");
  const totalIn  = rub.filter(x => x.type === "credit").reduce((s,x)=>s+Number(x.amount), 0);
  const totalOut = rub.filter(x => x.type === "debit") .reduce((s,x)=>s+Number(x.amount), 0);
  const avgCheck = rub.filter(x => x.type === "debit").length > 0
    ? totalOut / rub.filter(x => x.type === "debit").length : 0;

  const stepMonth = (d) => {
    setMonth(({ y, m }) => {
      let nm = m + d, ny = y;
      if (nm < 0) { nm = 11; ny--; }
      if (nm > 11){ nm = 0;  ny++; }
      return { y: ny, m: nm };
    });
    // Sync date range to month
    const ny = d > 0 ? (month.m === 11 ? month.y + 1 : month.y) : (month.m === 0 ? month.y - 1 : month.y);
    const nm = d > 0 ? (month.m === 11 ? 0 : month.m + 1) : (month.m === 0 ? 11 : month.m - 1);
    const mm = String(nm + 1).padStart(2, "0");
    const last = new Date(ny, nm + 1, 0).getDate();
    setFromDate(`${ny}-${mm}-01`);
    setToDate(`${ny}-${mm}-${last}`);
  };

  const resetFilters = () => {
    setFromDate("2026-05-01"); setToDate("2026-05-31");
    setTxType(""); setAccountId(""); setCategoryId(""); setSearch("");
  };
  const hasActiveFilter = !!(txType || accountId || categoryId || search);

  // Total savings for the sidebar mini
  const totalNet = MONTHLY_SUMMARY.reduce((s,m)=>s+Number(m.net), 0) / MONTHLY_SUMMARY.length;

  return (
    <div style={{
      minHeight: "100vh", background: c.bg, color: c.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", letterSpacing: "-0.01em",
    }}>
      <Sidebar activeRoute="/transactions" accent={t.accent} theme={t.theme}
        onThemeToggle={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}
        savings={62660} savingsGoal={SAVINGS_GOAL} />

      <main style={{ flex: 1, padding: "28px 36px 64px", minWidth: 0 }}>
        <TopBar
          greeting="Все операции в одном месте"
          title="Операции"
          c={c} accent={t.accent}
          month={month} monthName={monthName}
          onPrevMonth={() => stepMonth(-1)} onNextMonth={() => stepMonth(1)}
          primaryLabel="Добавить операцию"
        />

        {/* ════════════ Stat strip ════════════ */}
        <section style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18,
          marginBottom: 18,
        }}>
          <StatCard label="Операций" value={String(filtered.length)} sub={`за ${monthName.toLowerCase()}`}
            tint={cl.bg(c.dark ? "#1A2230" : "#EEF0FF")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={t.accent} icon={<IconList />} c={c}>
            {t.showSpark && <Sparkline color={t.accent} points={[3,5,4,7,5,8,6,9,8,11,9,12]} />}
          </StatCard>
          <StatCard label="Доходы" value={`+${formatMoney(totalIn)}`} sub={`${rub.filter(x=>x.type==="credit").length} операций`}
            tint={cl.bg(c.dark ? "#142421" : "#E8F7EE")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={INCOME} valueColor={INCOME} icon={<IconArrowDown />} c={c}>
            {t.showSpark && <Sparkline color={INCOME} points={[20,22,24,25,28,30,32,34,35,36,38,40]} />}
          </StatCard>
          <StatCard label="Расходы" value={`−${formatMoney(totalOut)}`} sub={`${rub.filter(x=>x.type==="debit").length} операций`}
            tint={cl.bg(c.dark ? "#2A1A1F" : "#FDECEC")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={EXPENSE} valueColor={EXPENSE} icon={<IconArrowUp />} c={c}>
            {t.showSpark && <Sparkline color={EXPENSE} points={[18,16,20,22,19,24,21,26,23,28,25,22]} />}
          </StatCard>
          <StatCard label="Средний чек" value={formatMoney(avgCheck)} sub="по расходам"
            tint={cl.bg(c.dark ? "#1B1B30" : "#EEEBFB")}
            radius={cl.radius} border={cl.border} shadow={cl.shadow}
            accent={t.accent} valueColor={t.accent} icon={<IconWallet />} c={c}>
            {t.showSpark && <Sparkline color={t.accent} points={[8,10,9,11,12,10,13,11,14,12,15,14]} />}
          </StatCard>
        </section>

        {/* ════════════ Filters ════════════ */}
        <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}
              pad={16} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PillGroup value={txType} accent={t.accent} c={c}
              options={[
                { value: "", label: "Все" },
                { value: "credit", label: "Доход", dot: INCOME },
                { value: "debit", label: "Расход", dot: EXPENSE },
                { value: "transfer", label: "Переводы", dot: t.accent },
              ]}
              onChange={setTxType} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DateInput value={fromDate} onChange={setFromDate} c={c} />
              <span style={{ color: c.textMute }}>—</span>
              <DateInput value={toDate} onChange={setToDate} c={c} />
            </div>

            <Select value={accountId} onChange={setAccountId} c={c}
              placeholder="Все счета" width={160}
              options={ACCOUNTS.map(a => ({ value: a.id, label: a.name }))} />

            <Select value={categoryId} onChange={setCategoryId} c={c}
              placeholder="Все категории" width={170}
              options={CATEGORIES.map(cat => ({ value: cat.id, label: cat.name }))} />

            <div style={{ flex: 1, minWidth: 180 }}>
              <TextInput value={search} onChange={setSearch} c={c}
                placeholder="Поиск по получателю или описанию…"
                icon={<IconSearch />} />
            </div>

            {hasActiveFilter && (
              <button onClick={resetFilters} style={{
                padding: "0 14px", height: 38, borderRadius: 10,
                background: "transparent", border: `1px dashed ${c.border}`,
                color: c.textDim, cursor: "pointer",
                fontSize: 13, fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                Сбросить
              </button>
            )}

            <button style={{
              padding: "0 14px", height: 38, borderRadius: 10,
              background: c.surface, border: `1px solid ${c.border}`,
              color: c.text, cursor: "pointer",
              fontSize: 13, fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              <IconDownload />
              Экспорт
            </button>
          </div>
        </Card>

        {/* ════════════ Layout: list + detail rail ════════════ */}
        <section style={{
          display: "grid",
          gridTemplateColumns: detailTx ? "1fr 360px" : "1fr",
          gap: 18, alignItems: "start",
        }}>
          {/* ── Transactions card */}
          <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow} pad={0}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "20px 24px 16px",
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Список операций
              </h2>
              <span style={{
                fontSize: 12, color: c.textDim,
                background: c.surfaceAlt, padding: "3px 10px", borderRadius: 999,
                border: `1px solid ${c.border}`,
              }}>{filtered.length}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => setTweak("groupByDate", !t.groupByDate)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 13, color: c.textDim, fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  <IconCalendar />
                  {t.groupByDate ? "По датам" : "Список"}
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState c={c}
                icon="🔍"
                title="Ничего не найдено"
                subtitle="Попробуйте сбросить фильтры или изменить период"
              />
            ) : t.groupByDate ? (
              <div>
                {groups.map(g => (
                  <DayGroup key={g.date} date={g.date} txs={g.txs} c={c} accent={t.accent}
                    onSelect={setDetailTx} selectedId={detailTx?.id} />
                ))}
              </div>
            ) : (
              <FlatTable rows={filtered} c={c} accent={t.accent}
                onSelect={setDetailTx} selectedId={detailTx?.id} />
            )}
          </Card>

          {/* ── Detail rail */}
          {detailTx && (
            <DetailPanel tx={detailTx} c={c} cl={cl} accent={t.accent} onClose={() => setDetailTx(null)} />
          )}
        </section>
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
          <TweakToggle label="Группировка по дате" value={t.groupByDate}
            onChange={v => setTweak("groupByDate", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Day group  — section per date, with subtotal pill
// ────────────────────────────────────────────────────────────────────────────
function DayGroup({ date, txs, c, accent, onSelect, selectedId }) {
  const d = new Date(date);
  const today = new Date("2026-05-18"); // demo "today"
  const diff = Math.round((today - d) / (1000 * 60 * 60 * 24));
  const dayLabel = diff === 0 ? "Сегодня" : diff === 1 ? "Вчера" : formatDateLong(date);
  const weekdays = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
  const wd = weekdays[d.getDay()];

  // Subtotal: + income, − expenses, ignore transfers
  let inSum = 0, outSum = 0;
  for (const tx of txs) {
    const n = Number(tx.amount);
    if (tx.currency !== "RUB") continue;
    if (tx.type === "credit") inSum += n;
    else if (tx.type === "debit") outSum += n;
  }
  const net = inSum - outSum;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 12,
        padding: "10px 24px",
        background: c.surfaceAlt,
        borderTop: `1px solid ${c.border}`,
        borderBottom: `1px solid ${c.border}`,
        fontSize: 12, color: c.textDim, fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <span style={{ color: c.text, fontWeight: 600 }}>{dayLabel}</span>
        <span>{wd}</span>
        <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums",
          color: net >= 0 ? INCOME : EXPENSE, textTransform: "none", letterSpacing: 0 }}>
          {net >= 0 ? "+" : "−"}{formatMoney(Math.abs(net))}
        </span>
      </div>
      {txs.map(tx => (
        <TransactionRow key={tx.id} tx={tx} c={c} accent={accent}
          onClick={() => onSelect(tx)} selected={tx.id === selectedId} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Single transaction row — same in flat + grouped views
// ────────────────────────────────────────────────────────────────────────────
function TransactionRow({ tx, c, accent, onClick, selected }) {
  const isIn = tx.type === "credit";
  const isTransfer = tx.type === "transfer";
  const color = tx.categoryColor || (isTransfer ? accent : c.textDim);
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "44px 1fr 160px 160px 28px",
        alignItems: "center", gap: 16,
        padding: "14px 24px",
        background: selected ? hexA(accent, 0.06) : hover ? c.surfaceAlt : "transparent",
        borderTop: `1px solid ${c.border}`,
        cursor: "pointer", transition: "background 0.12s ease",
        position: "relative",
      }}>
      {selected && (
        <span style={{
          position: "absolute", left: 0, top: 8, bottom: 8, width: 3,
          background: accent, borderRadius: 999,
        }} />
      )}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: hexA(color, 0.14), color,
        display: "grid", placeItems: "center",
        fontWeight: 600, fontSize: 15,
      }}>
        {isTransfer ? <IconTransfer /> : initialOf(tx.categoryName || tx.merchant)}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.merchant || tx.description || "Операция"}
        </div>
        <div style={{ fontSize: 12, color: c.textDim, marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.categoryName || (isTransfer ? "Перевод" : "Без категории")}
          {" · "}{tx.accountName}
        </div>
      </div>

      <div>
        <TypeBadge type={tx.type} c={c} />
      </div>

      <div style={{
        textAlign: "right", whiteSpace: "nowrap",
        fontWeight: 600, fontSize: 14,
        fontVariantNumeric: "tabular-nums",
        color: isIn ? INCOME : isTransfer ? accent : c.text,
      }}>
        {isIn ? "+" : isTransfer ? "" : "−"}{formatMoney(tx.amount, tx.currency)}
      </div>

      <div style={{ display: "grid", placeItems: "center", opacity: hover ? 1 : 0.4 }}>
        <IconBtnSmall c={c}><IconDots /></IconBtnSmall>
      </div>
    </div>
  );
}

// Flat (non-grouped) view: a small header + same rows
function FlatTable({ rows, c, accent, onSelect, selectedId }) {
  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "44px 1fr 160px 160px 28px",
        gap: 16, padding: "10px 24px",
        background: c.surfaceAlt,
        borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`,
        fontSize: 11, color: c.textMute, fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <span></span>
        <span>Описание</span>
        <span>Тип</span>
        <span style={{ textAlign: "right" }}>Сумма</span>
        <span></span>
      </div>
      {rows.map(tx => (
        <TransactionRow key={tx.id} tx={tx} c={c} accent={accent}
          onClick={() => onSelect(tx)} selected={tx.id === selectedId} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Detail panel — equivalent to SlideOver in real codebase, here a side rail
// ────────────────────────────────────────────────────────────────────────────
function DetailPanel({ tx, c, cl, accent, onClose }) {
  const isIn = tx.type === "credit";
  const isTransfer = tx.type === "transfer";
  const color = isIn ? INCOME : isTransfer ? accent : EXPENSE;
  const cat = tx.categoryColor || color;

  return (
    <Card c={c} radius={cl.radius} border={cl.border} shadow={cl.shadow}
          pad={0} style={{ position: "sticky", top: 28 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "16px 20px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Детали</h3>
        <button onClick={onClose} style={{
          marginLeft: "auto",
          background: "transparent", border: "none", cursor: "pointer",
          color: c.textDim, fontSize: 18, padding: 4,
          display: "grid", placeItems: "center",
        }}>×</button>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: hexA(cat, 0.14), color: cat,
          display: "grid", placeItems: "center",
          fontWeight: 600, fontSize: 22, marginBottom: 14,
        }}>
          {isTransfer ? <IconTransfer /> : initialOf(tx.categoryName || tx.merchant)}
        </div>
        <div style={{ fontSize: 12, color: c.textDim, marginBottom: 4 }}>
          {tx.categoryName || (isTransfer ? "Перевод" : "Без категории")}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {tx.merchant || tx.description || "Операция"}
        </div>
        <div style={{
          fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          color, marginTop: 8,
        }}>
          {isIn ? "+" : isTransfer ? "" : "−"}{formatMoney(tx.amount, tx.currency)}
        </div>
      </div>

      <dl style={{
        margin: 0, padding: "20px",
        display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 10, columnGap: 16,
        fontSize: 13,
      }}>
        <Row label="Дата"        c={c}>{formatDateLong(tx.date)}</Row>
        <Row label="Счёт"        c={c}>{tx.accountName}</Row>
        <Row label="Тип"         c={c}><TypeBadge type={tx.type} c={c} /></Row>
        {tx.description && tx.description !== tx.merchant && (
          <Row label="Описание" c={c}>{tx.description}</Row>
        )}
        <Row label="ID"          c={c}><code style={{ fontSize: 11, color: c.textDim }}>{tx.id}</code></Row>
      </dl>

      <div style={{
        display: "flex", gap: 8, padding: "0 20px 20px",
      }}>
        <button style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "transparent", border: `1px solid ${c.border}`,
          color: c.text, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          fontWeight: 500,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <IconEdit /> Изменить
        </button>
        <button style={{
          padding: "10px 14px", borderRadius: 10,
          background: hexA(EXPENSE, 0.1), border: `1px solid ${hexA(EXPENSE, 0.25)}`,
          color: EXPENSE, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          fontWeight: 500,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <IconTrash />
        </button>
      </div>
    </Card>
  );
}

function Row({ label, children, c }) {
  return (
    <React.Fragment>
      <dt style={{ color: c.textDim, fontSize: 12 }}>{label}</dt>
      <dd style={{ margin: 0, color: c.text, fontWeight: 500, textAlign: "right" }}>{children}</dd>
    </React.Fragment>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle, c }) {
  return (
    <div style={{
      padding: "64px 24px", textAlign: "center", color: c.textDim,
      borderTop: `1px solid ${c.border}`,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: c.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{subtitle}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
