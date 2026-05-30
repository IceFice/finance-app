// ════════════════════════════════════════════════════════════════════════════
// Бабкосчёт — Shared shell (v3)
// Sidebar, topbar, theming, formatters, icons. Used by all pages.
// ════════════════════════════════════════════════════════════════════════════

const INCOME = "#22C55E";
const EXPENSE = "#EF4444";
const WARN = "#F59E0B";
const SIDEBAR = "#1E2235";
const ACCENT_OPTIONS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B"];

// Nav routes — pointing at the static HTML pages we ship
const NAV = [
  { href: "Dashboard v3.html", route: "/dashboard",    label: "Главная",  Icon: IconHome },
  { href: "Accounts.html",     route: "/accounts",     label: "Счета",    Icon: IconWallet },
  { href: "Operations.html",   route: "/transactions", label: "Операции", Icon: IconList },
  { href: "Budgets.html",      route: "/budgets",      label: "Бюджеты",  Icon: IconTarget },
  { href: "Reports.html",      route: "/reports",      label: "Отчёты",   Icon: IconChart },
];

// ── Formatters ──────────────────────────────────────────────────────────────
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
function formatMoneyCompact(amount, currency = "RUB") {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  let s;
  if (abs >= 1_000_000) s = (n/1_000_000).toFixed(1).replace(/\.0$/,"") + "M";
  else if (abs >= 1000) s = (n/1000).toFixed(1).replace(/\.0$/,"") + "K";
  else s = String(Math.round(n));
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₽";
  return currency === "RUB" ? s + " " + sym : sym + s;
}
function sumMoney(values) {
  const cents = values.reduce((acc, v) => {
    const n = Number(v);
    return acc + (Number.isFinite(n) ? Math.round(n * 100) : 0);
  }, 0);
  return (cents / 100).toFixed(2);
}
const MONTHS_RU       = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const MONTHS_RU_LONG  = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_RU_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}
function formatDateLong(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}
function initialOf(name) {
  return (name || "?").trim().slice(0, 1).toUpperCase();
}

// ── Color utils ─────────────────────────────────────────────────────────────
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

// ── Theming ─────────────────────────────────────────────────────────────────
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
    warn:      WARN,
    sidebar:   SIDEBAR,
  };
}

function cardLook(t, c) {
  return {
    radius: t.cardStyle === "outlined" ? 14 : 18,
    bg: (tint) => t.cardStyle === "outlined" ? "transparent"
                 : t.cardStyle === "soft"    ? (tint ?? c.surface)
                 : c.surface,
    border: t.cardStyle === "outlined" ? `1px solid ${c.border}` : "none",
    shadow: t.cardStyle === "flat" || c.dark ? "none"
            : "0 1px 0 rgba(15,17,23,0.04), 0 8px 24px -16px rgba(15,17,23,0.08)",
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Sidebar
// ════════════════════════════════════════════════════════════════════════════
function Sidebar({ activeRoute, accent, theme, onThemeToggle, savings, savingsGoal }) {
  return (
    <aside style={{
      width: 244, flexShrink: 0,
      background: SIDEBAR, color: "#E9EAF1",
      padding: "28px 18px",
      display: "flex", flexDirection: "column", gap: 28,
      position: "sticky", top: 0, height: "100vh", boxSizing: "border-box",
    }}>
      <Logo accent={accent} />
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => (
          <NavItem key={n.route}
            href={n.href} label={n.label} Icon={n.Icon}
            active={n.route === activeRoute} accent={accent} />
        ))}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <SavingsMini accent={accent} value={savings} goal={savingsGoal} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarBtn icon={theme === "dark" ? "☀️" : "🌙"}
            label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            onClick={onThemeToggle} />
          <SidebarBtn icon="🚪" label="Выйти" danger />
        </div>
        <div style={{ padding: "0 8px", fontSize: 11, color: "#5B6178" }}>anna@babkoschet.ru</div>
      </div>
    </aside>
  );
}

function Logo({ accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: accent,
        display: "grid", placeItems: "center",
        boxShadow: `0 6px 16px -6px ${accent}`,
        fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.04em",
      }}>₽</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Бабкосчёт</div>
        <div style={{ fontSize: 11, color: "#7A809B" }}>Личные финансы</div>
      </div>
    </div>
  );
}

function NavItem({ href, label, Icon, active, accent }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? "rgba(255,255,255,0.06)" : hover ? "rgba(255,255,255,0.03)" : "transparent";
  return (
    <a href={href} style={{
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
// Top bar
// ════════════════════════════════════════════════════════════════════════════
function TopBar({ greeting, title, c, accent, month, monthName, onPrevMonth, onNextMonth, primaryLabel = "Добавить операцию", onPrimary }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
      <div style={{ minWidth: 0 }}>
        {greeting && (
          <div style={{ fontSize: 13, color: c.textDim, marginBottom: 4 }}>{greeting}</div>
        )}
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
      </div>

      {monthName && (
        <div style={{
          marginLeft: "auto",
          display: "flex", alignItems: "center",
          background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: 999, padding: 4, gap: 2,
        }}>
          <IconButton onClick={onPrevMonth} c={c}><Chevron dir="left" /></IconButton>
          <div style={{ padding: "0 14px", minWidth: 130, textAlign: "center", fontSize: 14, fontWeight: 500 }}>
            {monthName} {month.y}
          </div>
          <IconButton onClick={onNextMonth} c={c}><Chevron dir="right" /></IconButton>
        </div>
      )}

      <button style={{
        marginLeft: monthName ? 0 : "auto",
        position: "relative", width: 40, height: 40, borderRadius: 12,
        background: c.surface, border: `1px solid ${c.border}`,
        color: c.text, cursor: "pointer",
        display: "grid", placeItems: "center",
      }}>
        <IconBell />
        <span style={{
          position: "absolute", top: 8, right: 9,
          width: 8, height: 8, borderRadius: "50%",
          background: accent, border: `2px solid ${c.surface}`,
        }} />
      </button>

      {primaryLabel && (
        <button onClick={onPrimary} style={{
          background: accent, color: "#fff",
          border: "none", cursor: "pointer",
          padding: "0 18px", height: 40, borderRadius: 12,
          fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: `0 6px 16px -8px ${accent}`,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -2 }}>+</span>
          {primaryLabel}
        </button>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "4px 12px 4px 4px",
        background: c.surface, border: `1px solid ${c.border}`,
        borderRadius: 999,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: `linear-gradient(135deg, ${accent}, ${shade(accent, -20)})`,
          color: "#fff", display: "grid", placeItems: "center",
          fontSize: 13, fontWeight: 600,
        }}>АП</div>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Аня</span>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Card primitives
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

function SectionHeader({ title, count, right, c }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {count != null && (
        <span style={{
          fontSize: 12, color: c.textDim,
          background: c.surfaceAlt,
          padding: "3px 10px", borderRadius: 999,
          border: `1px solid ${c.border}`,
        }}>{count}</span>
      )}
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

function StatCard({ label, value, sub, tint, radius, border, shadow, accent, valueColor, icon, trend, progress, c, children }) {
  return (
    <div style={{
      background: tint, borderRadius: radius,
      border: border || "none", boxShadow: shadow || "none",
      padding: 20, display: "flex", flexDirection: "column", gap: 10,
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
        color: valueColor || c.text, fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1, marginTop: 2, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
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
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Buttons + inputs (chrome shared across pages)
// ════════════════════════════════════════════════════════════════════════════
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

function IconBtnSmall({ children, c, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 8,
      background: "transparent", border: "1px solid transparent",
      color: c.textDim, cursor: "pointer",
      display: "grid", placeItems: "center",
    }}
    onMouseEnter={e => e.currentTarget.style.background = c.surfaceAlt}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {children}
    </button>
  );
}

// Pill-style toggle group (Все / Доход / Расход)
function PillGroup({ value, options, onChange, c, accent }) {
  return (
    <div style={{
      display: "inline-flex", padding: 3, gap: 2,
      background: c.surfaceAlt, border: `1px solid ${c.border}`,
      borderRadius: 999,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: "6px 14px", border: "none", cursor: "pointer",
            borderRadius: 999, fontSize: 13, fontWeight: 500,
            background: active ? c.surface : "transparent",
            color: active ? c.text : c.textDim,
            boxShadow: active && !c.dark ? "0 1px 4px rgba(15,17,23,0.06)" : "none",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {o.dot && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: o.dot }} />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Select({ value, onChange, options, c, placeholder, width }) {
  return (
    <div style={{ position: "relative", width }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", WebkitAppearance: "none",
          width: "100%", padding: "9px 36px 9px 14px",
          background: c.surface, border: `1px solid ${c.border}`,
          color: value ? c.text : c.textDim,
          borderRadius: 10, fontSize: 13, fontFamily: "inherit",
          cursor: "pointer", outline: "none",
        }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        color: c.textDim, pointerEvents: "none", display: "grid", placeItems: "center",
      }}>
        <Chevron dir="down" />
      </span>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, c, icon, width }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "0 12px", height: 38,
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 10, width,
    }}>
      {icon && <span style={{ color: c.textDim, display: "grid", placeItems: "center" }}>{icon}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, border: "none", outline: "none",
          background: "transparent", color: c.text,
          fontSize: 13, fontFamily: "inherit",
        }} />
    </div>
  );
}

function DateInput({ value, onChange, c, width = 150 }) {
  return (
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "9px 12px", width,
        background: c.surface, border: `1px solid ${c.border}`,
        color: c.text, borderRadius: 10, fontSize: 13, fontFamily: "inherit",
        outline: "none",
        colorScheme: c.dark ? "dark" : "light",
      }} />
  );
}

// ── Type pill for transactions ──────────────────────────────────────────────
function TypeBadge({ type, c }) {
  const isIn = type === "credit";
  const isTransfer = type === "transfer";
  const color = isIn ? INCOME : isTransfer ? c.accent : EXPENSE;
  const label = isIn ? "Доход" : isTransfer ? "Перевод" : "Расход";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 500,
      background: hexA(color, 0.12), color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sparkline (also reused)
// ────────────────────────────────────────────────────────────────────────────
function Sparkline({ color, points, w = 80, h = 26 }) {
  const pts = points || [12, 18, 14, 22, 19, 26, 22, 30, 28, 34, 32, 38];
  const max = Math.max(...pts), min = Math.min(...pts);
  const range = (max - min) || 1;
  const step = w / (pts.length - 1);
  const ys = pts.map(p => h - ((p - min) / range) * h * 0.85 - h * 0.08);
  const path = pts.map((_, i) => `${i === 0 ? "M" : "L"} ${(i*step).toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = "g" + color.replace("#","") + Math.random().toString(36).slice(2,7);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
function IconTrash()     { return svg(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6"/></>); }
function IconSearch()    { return svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>); }
function IconCalendar()  { return svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>); }
function IconFilter()    { return svg(<><path d="M4 5h16l-6 8v6l-4-2v-4z" /></>); }
function IconDownload()  { return svg(<><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14"/></>); }
function IconTransfer()  { return svg(<><path d="M7 8h12M7 8l3-3M7 8l3 3" /><path d="M17 16H5m12 0-3-3m3 3-3 3"/></>); }
function IconCheck()     { return svg(<><path d="M5 12l5 5L20 7" /></>); }
function IconWarn()      { return svg(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>); }
function IconPlus()      { return svg(<><path d="M12 5v14M5 12h14" /></>); }
function IconRepeat()    { return svg(<><path d="M17 2l4 4-4 4" /><path d="M21 6H7a4 4 0 0 0-4 4v0" /><path d="M7 22l-4-4 4-4" /><path d="M3 18h14a4 4 0 0 0 4-4v0"/></>); }
function Chevron({ dir }) {
  const d = dir === "left"  ? "M15 6l-6 6 6 6"
         :  dir === "right" ? "M9 6l6 6-6 6"
         :  dir === "down"  ? "M6 9l6 6 6-6"
         :                    "M6 15l6-6 6 6";
  return svg(<path d={d} />);
}

// ════════════════════════════════════════════════════════════════════════════
// Shared mock data — same shapes the real API returns
// ════════════════════════════════════════════════════════════════════════════
const SAVINGS_GOAL = 80000;

const ACCOUNTS = [
  { id: "a1", name: "Тинькофф Black", type: "card",    currency: "RUB", balance: "184500.00", color: "#1E2235", icon: "💳", isActive: true },
  { id: "a2", name: "Сбер Дебет",     type: "card",    currency: "RUB", balance:  "62300.00", color: "#22C55E", icon: "💳", isActive: true },
  { id: "a3", name: "Наличные",       type: "cash",    currency: "RUB", balance:  "12650.00", color: "#F59E0B", icon: "💵", isActive: true },
  { id: "a4", name: "Копилка",        type: "savings", currency: "RUB", balance:  "62660.00", color: "#6366F1", icon: "🐷", isActive: true },
  { id: "a5", name: "PayPal",         type: "wallet",  currency: "USD", balance:    "340.20", color: "#0EA5E9", icon: "💳", isActive: true },
];

const CATEGORIES = [
  { id: "c1", name: "Продукты",         color: "#F59E0B", type: "expense" },
  { id: "c2", name: "Зарплата",         color: "#22C55E", type: "income"  },
  { id: "c3", name: "Кафе и рестораны", color: "#EC4899", type: "expense" },
  { id: "c4", name: "Транспорт",        color: "#0EA5E9", type: "expense" },
  { id: "c5", name: "Развлечения",      color: "#A855F7", type: "expense" },
  { id: "c6", name: "Фриланс",          color: "#10B981", type: "income"  },
  { id: "c7", name: "Аренда",           color: "#6366F1", type: "expense" },
  { id: "c8", name: "Покупки",          color: "#14B8A6", type: "expense" },
  { id: "c9", name: "Здоровье",         color: "#F43F5E", type: "expense" },
  { id: "c10", name: "Образование",     color: "#3B82F6", type: "expense" },
];

// Extended transaction list — used by Operations page
const TRANSACTIONS = [
  { id: "t1",  accountId: "a2", categoryId: "c1", amount:   "2480.00", currency: "RUB", type: "debit",
    merchant: "Перекрёсток",   description: "Продукты на неделю",        date: "2026-05-18",
    categoryName: "Продукты",         categoryColor: "#F59E0B", accountName: "Сбер Дебет" },
  { id: "t1b", accountId: "a3", categoryId: "c3", amount:    "450.00", currency: "RUB", type: "debit",
    merchant: "Шаверма у Ашота", description: "Обед",                    date: "2026-05-18",
    categoryName: "Кафе и рестораны", categoryColor: "#EC4899", accountName: "Наличные" },
  { id: "t2",  accountId: "a1", categoryId: "c2", amount: "120000.00", currency: "RUB", type: "credit",
    merchant: "ООО Контур",    description: "Зарплата за май",            date: "2026-05-17",
    categoryName: "Зарплата",         categoryColor: "#22C55E", accountName: "Тинькофф Black" },
  { id: "t3",  accountId: "a2", categoryId: "c3", amount:    "890.00", currency: "RUB", type: "debit",
    merchant: "Surf Coffee",   description: "Капучино + круассан",        date: "2026-05-16",
    categoryName: "Кафе и рестораны", categoryColor: "#EC4899", accountName: "Сбер Дебет" },
  { id: "t3b", accountId: "a1", categoryId: "c9", amount:   "3200.00", currency: "RUB", type: "debit",
    merchant: "Аптека Ригла",  description: "Витамины",                   date: "2026-05-16",
    categoryName: "Здоровье",         categoryColor: "#F43F5E", accountName: "Тинькофф Black" },
  { id: "t4",  accountId: "a1", categoryId: "c4", amount:   "1240.00", currency: "RUB", type: "debit",
    merchant: "Yandex Go",     description: "Метро + такси",              date: "2026-05-15",
    categoryName: "Транспорт",        categoryColor: "#0EA5E9", accountName: "Тинькофф Black" },
  { id: "t4b", accountId: "a4", categoryId: null, amount:  "15000.00", currency: "RUB", type: "transfer",
    merchant: "Копилка",       description: "На отпуск",                  date: "2026-05-15",
    categoryName: null,                 categoryColor: null,      accountName: "Тинькофф Black → Копилка" },
  { id: "t5",  accountId: "a1", categoryId: "c5", amount:   "1800.00", currency: "RUB", type: "debit",
    merchant: "Каро Фильм",    description: "Кинотеатр, 2 билета",        date: "2026-05-14",
    categoryName: "Развлечения",      categoryColor: "#A855F7", accountName: "Тинькофф Black" },
  { id: "t6",  accountId: "a5", categoryId: "c6", amount:    "320.00", currency: "USD", type: "credit",
    merchant: "Upwork",        description: "Дизайн логотипа",            date: "2026-05-13",
    categoryName: "Фриланс",          categoryColor: "#10B981", accountName: "PayPal" },
  { id: "t7",  accountId: "a1", categoryId: "c7", amount:  "45000.00", currency: "RUB", type: "debit",
    merchant: "Иванов И.И.",   description: "Аренда квартиры",            date: "2026-05-12",
    categoryName: "Аренда",           categoryColor: "#6366F1", accountName: "Тинькофф Black" },
  { id: "t8",  accountId: "a2", categoryId: "c8", amount:   "4320.00", currency: "RUB", type: "debit",
    merchant: "Ozon",          description: "Кроссовки",                  date: "2026-05-11",
    categoryName: "Покупки",          categoryColor: "#14B8A6", accountName: "Сбер Дебет" },
  { id: "t9",  accountId: "a2", categoryId: "c1", amount:   "1620.00", currency: "RUB", type: "debit",
    merchant: "ВкусВилл",      description: "Продукты",                   date: "2026-05-10",
    categoryName: "Продукты",         categoryColor: "#F59E0B", accountName: "Сбер Дебет" },
  { id: "t10", accountId: "a1", categoryId: "c10", amount:  "8900.00", currency: "RUB", type: "debit",
    merchant: "Skillbox",      description: "Курс по UX",                  date: "2026-05-09",
    categoryName: "Образование",      categoryColor: "#3B82F6", accountName: "Тинькофф Black" },
  { id: "t11", accountId: "a1", categoryId: "c4", amount:    "560.00", currency: "RUB", type: "debit",
    merchant: "BlaBlaCar",     description: "Поездка в Тверь",            date: "2026-05-08",
    categoryName: "Транспорт",        categoryColor: "#0EA5E9", accountName: "Тинькофф Black" },
  { id: "t12", accountId: "a2", categoryId: "c3", amount:   "2150.00", currency: "RUB", type: "debit",
    merchant: "Чайхона №1",    description: "Ужин с подругой",            date: "2026-05-07",
    categoryName: "Кафе и рестораны", categoryColor: "#EC4899", accountName: "Сбер Дебет" },
  { id: "t13", accountId: "a1", categoryId: "c8", amount:   "3490.00", currency: "RUB", type: "debit",
    merchant: "WB",            description: "Постельное бельё",           date: "2026-05-06",
    categoryName: "Покупки",          categoryColor: "#14B8A6", accountName: "Тинькофф Black" },
  { id: "t14", accountId: "a3", categoryId: "c1", amount:    "780.00", currency: "RUB", type: "debit",
    merchant: "Магнит",        description: "Хлеб, молоко",               date: "2026-05-05",
    categoryName: "Продукты",         categoryColor: "#F59E0B", accountName: "Наличные" },
  { id: "t15", accountId: "a5", categoryId: "c6", amount:    "180.00", currency: "USD", type: "credit",
    merchant: "Behance Pro",   description: "Подписка возврат",           date: "2026-05-04",
    categoryName: "Фриланс",          categoryColor: "#10B981", accountName: "PayPal" },
];

// Extended budgets — Budgets page
const BUDGETS = [
  { id: "b1", name: "Продукты",          categoryName: "Продукты",         categoryColor: "#F59E0B", amount: "20000.00", spent: "12480.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b2", name: "Кафе и рестораны",  categoryName: "Кафе и рестораны", categoryColor: "#EC4899", amount: "10000.00", spent:  "8890.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b3", name: "Транспорт",         categoryName: "Транспорт",        categoryColor: "#0EA5E9", amount:  "8000.00", spent:  "6240.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b4", name: "Развлечения",       categoryName: "Развлечения",      categoryColor: "#A855F7", amount:  "5000.00", spent:  "5800.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b5", name: "Покупки",           categoryName: "Покупки",          categoryColor: "#14B8A6", amount: "15000.00", spent:  "7810.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b6", name: "Образование",       categoryName: "Образование",      categoryColor: "#3B82F6", amount: "12000.00", spent:  "8900.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b7", name: "Здоровье",          categoryName: "Здоровье",         categoryColor: "#F43F5E", amount:  "6000.00", spent:  "3200.00", currency: "RUB", period: "monthly", startDate: "2026-05-01", endDate: null },
  { id: "b8", name: "Отпуск",            categoryName: null,                categoryColor: "#10B981", amount: "60000.00", spent: "18500.00", currency: "RUB", period: "yearly",  startDate: "2026-01-01", endDate: "2026-12-31" },
];

// Reports — monthly summary (6 months)
const MONTHLY_SUMMARY = [
  { month: "Дек",  income: "118000.00", expenses: "84000.00", net: "34000.00" },
  { month: "Янв",  income: "122000.00", expenses: "91000.00", net: "31000.00" },
  { month: "Фев",  income: "125000.00", expenses: "76000.00", net: "49000.00" },
  { month: "Мар",  income: "130000.00", expenses: "89000.00", net: "41000.00" },
  { month: "Апр",  income: "139000.00", expenses: "86000.00", net: "53000.00" },
  { month: "Май",  income: "145000.00", expenses: "82340.00", net: "62660.00" },
];

const SPENDING_BY_CATEGORY = [
  { categoryId: "c7", categoryName: "Аренда",           categoryColor: "#6366F1", total: "45000.00", percentage: "54.6" },
  { categoryId: "c1", categoryName: "Продукты",         categoryColor: "#F59E0B", total: "12480.00", percentage: "15.2" },
  { categoryId: "c3", categoryName: "Кафе и рестораны", categoryColor: "#EC4899", total:  "8890.00", percentage: "10.8" },
  { categoryId: "c4", categoryName: "Транспорт",        categoryColor: "#0EA5E9", total:  "6240.00", percentage:  "7.6" },
  { categoryId: "c5", categoryName: "Развлечения",      categoryColor: "#A855F7", total:  "5800.00", percentage:  "7.1" },
  { categoryId: "c8", categoryName: "Покупки",          categoryColor: "#14B8A6", total:  "3930.00", percentage:  "4.7" },
];

// Make everything available to other Babel <script> blocks
Object.assign(window, {
  // constants
  INCOME, EXPENSE, WARN, SIDEBAR, ACCENT_OPTIONS, NAV,
  SAVINGS_GOAL, ACCOUNTS, CATEGORIES, TRANSACTIONS, BUDGETS, MONTHLY_SUMMARY, SPENDING_BY_CATEGORY,
  MONTHS_RU, MONTHS_RU_LONG, MONTHS_RU_SHORT,
  // utils
  formatMoney, formatMoneyCompact, sumMoney, formatDate, formatDateLong, initialOf, hexA, shade,
  useTheme, cardLook,
  // components
  Sidebar, TopBar, Card, SectionHeader, StatCard,
  IconButton, IconBtnSmall, PillGroup, Select, TextInput, DateInput, TypeBadge, Sparkline,
  // icons
  IconHome, IconList, IconChart, IconTarget, IconBell, IconWallet, IconArrowDown, IconArrowUp,
  IconPig, IconEdit, IconDots, IconTrash, IconSearch, IconCalendar, IconFilter,
  IconDownload, IconTransfer, IconCheck, IconWarn, IconPlus, IconRepeat, Chevron,
});
