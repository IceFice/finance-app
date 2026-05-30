// Бабкосчёт — Dashboard
// Adapted from the Figma wireframe template: dark sidebar, mint-card DNA,
// soft glowing line-chart treatment. Color overrides applied per brief.

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

// ------------------------------------------------------------------
// Data
// ------------------------------------------------------------------
const NAV = [
  { id: "home", label: "Главная", icon: IconHome, active: true },
  { id: "ops", label: "Операции", icon: IconList },
  { id: "rep", label: "Отчёты", icon: IconChart },
  { id: "cat", label: "Категории", icon: IconTag },
  { id: "set", label: "Настройки", icon: IconCog },
];

const OPERATIONS = [
  { date: "18 мая",  cat: "Продукты",        catKey: "groceries",  type: "Расход", amount: -2480,   note: "Перекрёсток" },
  { date: "17 мая",  cat: "Зарплата",        catKey: "salary",     type: "Доход",  amount: 120000,  note: "ООО Контур" },
  { date: "16 мая",  cat: "Кафе и рестораны", catKey: "cafe",      type: "Расход", amount: -890,    note: "Surf Coffee" },
  { date: "15 мая",  cat: "Транспорт",       catKey: "transport",  type: "Расход", amount: -1240,   note: "Метро + такси" },
  { date: "14 мая",  cat: "Развлечения",     catKey: "fun",        type: "Расход", amount: -1800,   note: "Кинотеатр" },
  { date: "13 мая",  cat: "Фриланс",         catKey: "freelance",  type: "Доход",  amount: 25000,   note: "Заказчик #2" },
  { date: "12 мая",  cat: "Аренда",          catKey: "rent",       type: "Расход", amount: -45000,  note: "Квартира" },
  { date: "11 мая",  cat: "Покупки",         catKey: "shopping",   type: "Расход", amount: -4320,   note: "Ozon" },
];

// Categories for donut (top 6 by spend in May 2026)
const CATEGORIES = [
  { key: "rent",      label: "Аренда",            value: 45000, color: "#6366F1" },
  { key: "groceries", label: "Продукты",          value: 12480, color: "#F59E0B" },
  { key: "cafe",      label: "Кафе и рестораны",  value: 8890,  color: "#EC4899" },
  { key: "transport", label: "Транспорт",         value: 6240,  color: "#0EA5E9" },
  { key: "fun",       label: "Развлечения",       value: 5800,  color: "#A855F7" },
  { key: "shopping",  label: "Покупки",           value: 3930,  color: "#14B8A6" },
];

const CAT_ICON = {
  groceries: IconBasket,
  salary: IconBriefcase,
  cafe: IconCup,
  transport: IconTram,
  fun: IconFilm,
  freelance: IconLaptop,
  rent: IconHouse,
  shopping: IconBag,
};

// ------------------------------------------------------------------
// Format helpers
// ------------------------------------------------------------------
const fmtRub = (n) => {
  const abs = Math.abs(n).toLocaleString("ru-RU");
  return (n < 0 ? "−" : "") + abs + " ₽";
};
const fmtSigned = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toLocaleString("ru-RU") + " ₽";

// ==================================================================
// Theming
// ==================================================================
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
    mint:      dark ? "#2A3A3A" : "#D5E2DF",
    sidebar:   SIDEBAR,
  };
}

// ==================================================================
// App
// ==================================================================
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const c = useTheme(t);
  const [month, setMonth] = React.useState({ y: 2026, m: 4 }); // 0-idx, май
  const monthName = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"][month.m];
  const stepMonth = (d) => setMonth(({y,m}) => {
    let nm = m + d, ny = y;
    if (nm < 0) { nm = 11; ny--; }
    if (nm > 11){ nm = 0;  ny++; }
    return { y: ny, m: nm };
  });

  const cardRadius = t.cardStyle === "outlined" ? 14 : 18;
  const cardBg = (tint) => {
    if (t.cardStyle === "outlined") return "transparent";
    if (t.cardStyle === "soft")     return tint ?? c.surface;
    return c.surface; // flat fill
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
      {/* ============ SIDEBAR ============ */}
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
          {NAV.map(n => (
            <NavItem key={n.id} {...n} accent={t.accent} />
          ))}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <BalanceMini accent={t.accent} />
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <main style={{ flex: 1, padding: "28px 36px 64px", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 28,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: c.textDim, marginBottom: 4, fontFeatureSettings: '"ss01"' }}>
              Привет, Аня 👋
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}>Главная</h1>
          </div>

          {/* Month selector */}
          <div style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 999,
            padding: "4px",
            gap: 2,
          }}>
            <IconButton onClick={() => stepMonth(-1)} c={c}><Chevron dir="left" /></IconButton>
            <div style={{
              padding: "0 14px",
              minWidth: 130,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 500,
            }}>{monthName} {month.y}</div>
            <IconButton onClick={() => stepMonth(1)} c={c}><Chevron dir="right" /></IconButton>
          </div>

          <button style={{
            position: "relative",
            width: 40, height: 40,
            borderRadius: 12,
            background: c.surface,
            border: `1px solid ${c.border}`,
            color: c.text,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}>
            <IconBell />
            <span style={{
              position: "absolute",
              top: 8, right: 9,
              width: 8, height: 8,
              borderRadius: "50%",
              background: t.accent,
              border: `2px solid ${c.surface}`,
            }} />
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 12px 4px 4px",
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 999,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${t.accent}, ${shade(t.accent, -20)})`,
              color: "#fff",
              display: "grid", placeItems: "center",
              fontSize: 13, fontWeight: 600,
            }}>АП</div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Аня</span>
          </div>
        </header>

        {/* ============ Stat cards ============ */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 18,
          marginBottom: 22,
        }}>
          <StatCard
            label="Баланс"
            value={fmtRub(287450)}
            sub="Все счета"
            tint={cardBg(c.dark ? "#1A2230" : "#EEF0FF")}
            radius={cardRadius}
            border={cardBorder}
            shadow={cardShadow}
            accent={t.accent}
            icon={<IconWallet />}
            showSpark={t.showSpark}
            sparkColor={t.accent}
            isPrimary
            c={c}
          />
          <StatCard
            label="Доходы"
            value={fmtSigned(145000)}
            sub="за май"
            tint={cardBg(c.dark ? "#142421" : "#E8F7EE")}
            radius={cardRadius}
            border={cardBorder}
            shadow={cardShadow}
            accent={INCOME}
            valueColor={INCOME}
            icon={<IconArrowDown />}
            showSpark={t.showSpark}
            sparkColor={INCOME}
            trend="+12% к апрелю"
            c={c}
          />
          <StatCard
            label="Расходы"
            value={fmtSigned(-82340)}
            sub="за май"
            tint={cardBg(c.dark ? "#2A1A1F" : "#FDECEC")}
            radius={cardRadius}
            border={cardBorder}
            shadow={cardShadow}
            accent={EXPENSE}
            valueColor={EXPENSE}
            icon={<IconArrowUp />}
            showSpark={t.showSpark}
            sparkColor={EXPENSE}
            trend="−4% к апрелю"
            c={c}
          />
          <StatCard
            label="Сбережения"
            value={fmtSigned(62660)}
            sub="цель 80 000 ₽"
            tint={cardBg(c.dark ? "#1B1B30" : "#EEEBFB")}
            radius={cardRadius}
            border={cardBorder}
            shadow={cardShadow}
            accent={t.accent}
            valueColor={t.accent}
            icon={<IconPig />}
            progress={62660 / 80000}
            c={c}
          />
        </section>

        {/* ============ Main grid ============ */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 18,
          alignItems: "start",
        }}>
          {/* Transactions table */}
          <Card c={c} radius={cardRadius} border={cardBorder} shadow={cardShadow} pad={0}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "20px 24px 16px",
            }}>
              <h2 style={{
                margin: 0, fontSize: 18, fontWeight: 600,
                letterSpacing: "-0.01em",
              }}>Последние операции</h2>
              <span style={{
                fontSize: 12, color: c.textDim,
                background: c.surfaceAlt,
                padding: "3px 10px", borderRadius: 999,
                border: `1px solid ${c.border}`,
              }}>{OPERATIONS.length} за неделю</span>
              <button style={{
                marginLeft: "auto",
                fontSize: 13, fontWeight: 500,
                color: t.accent, background: "transparent",
                border: "none", cursor: "pointer",
                padding: 0,
              }}>Все операции →</button>
            </div>

            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}>
              <thead>
                <tr style={{
                  fontSize: 11,
                  color: c.textMute,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}>
                  <Th c={c} pl>Дата</Th>
                  <Th c={c}>Категория</Th>
                  <Th c={c}>Тип</Th>
                  <Th c={c} right>Сумма</Th>
                  <Th c={c} right pr>Действия</Th>
                </tr>
              </thead>
              <tbody>
                {OPERATIONS.map((op, i) => {
                  const Icon = CAT_ICON[op.catKey] || IconTag;
                  const isIn = op.type === "Доход";
                  return (
                    <tr key={i} style={{
                      borderTop: `1px solid ${c.border}`,
                    }}>
                      <Td c={c} pl>
                        <div style={{ color: c.text }}>{op.date}</div>
                        <div style={{ fontSize: 11, color: c.textMute }}>2026</div>
                      </Td>
                      <Td c={c}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: c.surfaceAlt,
                            border: `1px solid ${c.border}`,
                            display: "grid", placeItems: "center",
                            color: c.textDim,
                          }}><Icon /></div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{op.cat}</div>
                            <div style={{ fontSize: 12, color: c.textDim }}>{op.note}</div>
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
                          {op.type}
                        </span>
                      </Td>
                      <Td c={c} right>
                        <span style={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          color: isIn ? INCOME : c.text,
                        }}>{fmtSigned(op.amount)}</span>
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
              <span style={{ fontSize: 12, color: c.textDim }}>Май</span>
            </div>
            <div style={{ fontSize: 12, color: c.textDim, marginBottom: 18 }}>
              Топ-6 категорий месяца
            </div>

            <Donut categories={CATEGORIES} c={c} accent={t.accent} />

            <ul style={{
              listStyle: "none", padding: 0, margin: "20px 0 0",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {CATEGORIES.map(cat => {
                const total = CATEGORIES.reduce((s,x) => s+x.value, 0);
                const pct = Math.round(cat.value / total * 100);
                return (
                  <li key={cat.key} style={{
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 3,
                      background: cat.color,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cat.label}
                    </span>
                    <span style={{
                      fontSize: 12, color: c.textDim,
                      fontVariantNumeric: "tabular-nums",
                      width: 32, textAlign: "right",
                    }}>{pct}%</span>
                    <span style={{
                      fontSize: 14, fontWeight: 500,
                      fontVariantNumeric: "tabular-nums",
                      width: 84, textAlign: "right",
                    }}>{cat.value.toLocaleString("ru-RU")} ₽</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      </main>

      {/* ============ Tweaks ============ */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Тема">
          <TweakRadio
            label="Режим"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[{value:"light",label:"Светлая"},{value:"dark",label:"Тёмная"}]}
          />
        </TweakSection>
        <TweakSection label="Акцент">
          <TweakColor
            label="Цвет"
            value={t.accent}
            onChange={(v) => setTweak("accent", v)}
            options={ACCENT_OPTIONS}
          />
        </TweakSection>
        <TweakSection label="Карточки">
          <TweakRadio
            label="Стиль"
            value={t.cardStyle}
            onChange={(v) => setTweak("cardStyle", v)}
            options={[
              {value:"soft",label:"Мягкие"},
              {value:"flat",label:"Плоские"},
              {value:"outlined",label:"Контур"},
            ]}
          />
          <TweakToggle
            label="Спарклайны"
            value={t.showSpark}
            onChange={(v) => setTweak("showSpark", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ==================================================================
// Subcomponents
// ==================================================================
function Card({ children, c, radius=18, border, shadow, pad=22 }) {
  return (
    <div style={{
      background: c.surface,
      borderRadius: radius,
      border: border || "none",
      boxShadow: shadow || "none",
      padding: pad,
      boxSizing: "border-box",
    }}>{children}</div>
  );
}

function StatCard({
  label, value, sub, tint, radius, border, shadow,
  accent, valueColor, icon, showSpark, sparkColor, trend, progress, isPrimary, c,
}) {
  return (
    <div style={{
      background: tint,
      borderRadius: radius,
      border: border || "none",
      boxShadow: shadow || "none",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minHeight: 148,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: hexA(accent, c.dark ? 0.22 : 0.14),
          color: accent,
          display: "grid", placeItems: "center",
        }}>{icon}</div>
        <div style={{ fontSize: 13, color: c.textDim, fontWeight: 500 }}>{label}</div>
      </div>

      <div style={{
        fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em",
        color: valueColor || c.text,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
        marginTop: 2,
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
        {showSpark && !progress && <Sparkline color={sparkColor} />}
        {progress != null && (
          <div style={{
            flex: 1,
            height: 6,
            borderRadius: 999,
            background: hexA(accent, 0.18),
            overflow: "hidden",
            marginLeft: 12,
          }}>
            <div style={{
              width: `${Math.min(100, progress * 100)}%`,
              height: "100%",
              background: accent,
              borderRadius: 999,
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkline({ color }) {
  // pretty mini sparkline using a gentle wave
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

function Donut({ categories, c, accent }) {
  const total = categories.reduce((s,x) => s+x.value, 0);
  const size = 220, stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  // small gap between segments
  const gap = 2;
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "8px 0" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
             style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={c.dark ? "#2A2F3F" : "#EFEEE7"} strokeWidth={stroke} />
          {categories.map(cat => {
            const frac = cat.value / total;
            const len = Math.max(0, C * frac - gap);
            const dash = `${len} ${C - len}`;
            const seg = (
              <circle key={cat.key}
                cx={cx} cy={cy} r={r} fill="none"
                stroke={cat.color}
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
        <div style={{
          position: "absolute", inset: 0,
          display: "grid", placeItems: "center",
          textAlign: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: c.textDim, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Всего
            </div>
            <div style={{
              fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}>{total.toLocaleString("ru-RU")} ₽</div>
            <div style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}>6 категорий</div>
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
      padding: `12px 12px`,
      paddingLeft: pl ? 24 : 12,
      paddingRight: pr ? 24 : 12,
      fontWeight: 500,
      color: c.textMute,
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
      verticalAlign: "middle",
      color: c.text,
    }}>{children}</td>
  );
}

function IconButton({ children, onClick, c }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 999,
      background: "transparent",
      border: "none", color: c.text, cursor: "pointer",
      display: "grid", placeItems: "center",
    }}>{children}</button>
  );
}
function IconBtnSmall({ children, c }) {
  return (
    <button style={{
      width: 28, height: 28, borderRadius: 8,
      background: "transparent",
      border: `1px solid transparent`,
      color: c.textDim, cursor: "pointer",
      display: "grid", placeItems: "center",
    }}
    onMouseEnter={(e)=>{e.currentTarget.style.background = c.surfaceAlt;}}
    onMouseLeave={(e)=>{e.currentTarget.style.background = "transparent";}}
    >{children}</button>
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

function NavItem({ label, icon: Icon, active, accent }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? "rgba(255,255,255,0.06)" : hover ? "rgba(255,255,255,0.03)" : "transparent";
  return (
    <a href="#" style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px",
      borderRadius: 10,
      textDecoration: "none",
      color: active ? "#FFFFFF" : "#B5B9CC",
      fontSize: 14, fontWeight: active ? 500 : 400,
      background: bg,
      position: "relative",
    }}
    onMouseEnter={()=>setHover(true)}
    onMouseLeave={()=>setHover(false)}
    >
      {active && (
        <span style={{
          position: "absolute",
          left: -18,
          top: 8, bottom: 8,
          width: 3,
          borderRadius: 999,
          background: accent,
        }} />
      )}
      <Icon active={active} />
      <span>{label}</span>
    </a>
  );
}

function BalanceMini({ accent }) {
  return (
    <div style={{
      borderRadius: 14,
      padding: 14,
      background: "linear-gradient(160deg, rgba(99,102,241,0.18), rgba(99,102,241,0.04))",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ fontSize: 11, color: "#9298AC", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
        Накопительный
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
        62 660 ₽
      </div>
      <div style={{
        height: 5, borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        marginTop: 10, overflow: "hidden",
      }}>
        <div style={{ width: "78%", height: "100%", background: accent, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 11, color: "#9298AC", marginTop: 8 }}>78% от цели 80 000 ₽</div>
    </div>
  );
}

// ==================================================================
// Color utils
// ==================================================================
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

// ==================================================================
// Icons (16px line, currentColor)
// ==================================================================
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
function IconTag()       { return svg(<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>); }
function IconCog()       { return svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>); }
function IconBell()      { return svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></>); }
function IconWallet()    { return svg(<><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" /><path d="M22 11h-5a2 2 0 1 0 0 4h5z" /></>); }
function IconArrowDown() { return svg(<><path d="M12 5v14M5 13l7 7 7-7" /></>); }
function IconArrowUp()   { return svg(<><path d="M12 19V5M5 11l7-7 7 7" /></>); }
function IconPig()       { return svg(<><path d="M16 4l1 3h3v4l-2 1a6 6 0 0 1-6 6H8a5 5 0 0 1-5-5v-1a5 5 0 0 1 5-5h6" /><circle cx="16" cy="11" r="0.6" fill="currentColor"/><path d="M5 18v2M11 18v2" /></>); }
function IconBasket()    { return svg(<><path d="M3 9h18l-2 11H5z" /><path d="M8 9V5a4 4 0 0 1 8 0v4" /></>); }
function IconBriefcase() { return svg(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>); }
function IconCup()       { return svg(<><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M17 10h2a2 2 0 0 1 0 4h-2" /><path d="M7 3v2M11 3v2M15 3v2" /></>); }
function IconTram()      { return svg(<><rect x="5" y="3" width="14" height="14" rx="2" /><path d="M5 12h14" /><circle cx="8.5" cy="15" r="0.6" fill="currentColor" /><circle cx="15.5" cy="15" r="0.6" fill="currentColor" /><path d="M7 21l2-3M17 21l-2-3" /></>); }
function IconFilm()      { return svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>); }
function IconLaptop()    { return svg(<><rect x="3" y="5" width="18" height="11" rx="2" /><path d="M2 20h20" /></>); }
function IconHouse()     { return svg(<><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H10v7H4a1 1 0 0 1-1-1z" /></>); }
function IconBag()       { return svg(<><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>); }
function IconEdit()      { return svg(<><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M14 6l4 4" /></>); }
function IconDots()      { return svg(<><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></>); }
function Chevron({dir}) {
  const d = dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return svg(<path d={d} />);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
