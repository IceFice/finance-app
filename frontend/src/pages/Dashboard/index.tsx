import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAccounts, Account } from '@/hooks/useAccounts';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useBudgets, Budget } from '@/hooks/useBudgets';
import {
  useReportsMonthlySummary,
  useReportsSpendingByCategory,
} from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney, sumMoney, cn } from '@/lib/utils';
import {
  IconBell, IconChevL, IconChevR, IconWallet, IconChart,
} from '@/components/layout/NavIcons';

// ───────────────────────── Helpers ─────────────────────────
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const SHORT_MONTH = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${SHORT_MONTH[d.getMonth()]}`;
}
function initialOf(s: string | null | undefined): string {
  return (s || '?').trim().slice(0, 1).toUpperCase();
}
function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0xff) + amt;
  const B = (num & 0xff) + amt;
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  return '#' + (0x1000000 + clamp(R) * 0x10000 + clamp(G) * 0x100 + clamp(B)).toString(16).slice(1);
}

const INCOME = '#22C55E';
const EXPENSE = '#EF4444';
const ACCENT = '#6366F1';

// ───────────────────────── Sub-components ─────────────────────────

function Sparkline({ color, seed }: { color: string; seed?: number[] }) {
  // Pure decoration. Stable per render via prop or fallback.
  const pts = seed ?? [12, 18, 14, 22, 19, 26, 22, 30, 28, 34, 32, 38];
  const w = 88, h = 28, max = 40, min = 8;
  const step = w / (pts.length - 1);
  const ys = pts.map((p) => h - ((p - min) / (max - min)) * h);
  const path = pts.map((_, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gid = 'g' + color.replace('#', '');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0" aria-hidden="true">
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

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  valueClassName?: string;
  /** Tailwind class for the card background (light + dark variants), e.g. "bg-[#EEF0FF] dark:bg-[#1A2230]". */
  tintClass: string;
  accent: string;
  icon: React.ReactNode;
  progress?: number;
}
function StatCard({ label, value, sub, trend, valueClassName, tintClass, accent, icon, progress }: StatCardProps) {
  return (
    <div className={cn('rounded-2xl p-5 min-h-[148px] flex flex-col gap-2.5 shadow-soft relative overflow-hidden', tintClass)}>
      <div className="flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-[10px] grid place-items-center"
          style={{ backgroundColor: hexA(accent, 0.16), color: accent }}
        >
          {icon}
        </span>
        <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className={cn('text-[28px] font-semibold leading-tight tracking-tight tnum truncate', valueClassName ?? 'text-gray-900 dark:text-white')}>
        {value}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {trend ? (
            <span
              className="font-medium"
              style={{ color: trend.startsWith('+') ? INCOME : EXPENSE }}
            >
              {trend}
            </span>
          ) : sub}
        </div>
        {progress !== undefined ? (
          <div className="flex-1 ml-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: hexA(accent, 0.18) }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, backgroundColor: accent }} />
          </div>
        ) : (
          <Sparkline color={accent} />
        )}
      </div>
    </div>
  );
}

function MonthPill({ date, onPrev, onNext }: { date: { y: number; m: number }; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="inline-flex items-center bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-full p-1">
      <button onClick={onPrev} aria-label="Предыдущий месяц" className="w-7 h-7 rounded-full grid place-items-center hover:bg-gray-100 dark:hover:bg-white/5">
        <IconChevL />
      </button>
      <span className="px-3 min-w-[120px] text-center text-sm font-medium tabular-nums">
        {MONTHS_RU[date.m]} {date.y}
      </span>
      <button onClick={onNext} aria-label="Следующий месяц" className="w-7 h-7 rounded-full grid place-items-center hover:bg-gray-100 dark:hover:bg-white/5">
        <IconChevR />
      </button>
    </div>
  );
}

function AccountCard({ acc }: { acc: Account }) {
  const bg = acc.color || ACCENT;
  const typeLabel: Record<string, string> = {
    checking: 'Текущий', savings: 'Накопительный', credit_card: 'Кредит. карта',
    cash: 'Наличные', investment: 'Инвестиции', loan: 'Кредит',
  };
  return (
    <Link
      to="/accounts"
      className="flex-shrink-0 w-[220px] p-4 pb-[18px] rounded-2xl text-white relative overflow-hidden no-underline"
      style={{
        background: `linear-gradient(150deg, ${bg}, ${shade(bg, -22)})`,
        boxShadow: `0 10px 24px -16px ${hexA(bg, 0.6)}`,
      }}
    >
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[0.05em] opacity-80">
          {typeLabel[acc.type] ?? acc.type}
        </span>
        <span className="text-base leading-none">{acc.icon ?? '💳'}</span>
      </div>
      <div className="text-[13px] opacity-85 mb-0.5 truncate">{acc.name}</div>
      <div className="text-[20px] font-semibold tracking-tight tnum">
        {formatMoney(acc.balance, acc.currency)}
      </div>
    </Link>
  );
}

function AddAccountCard() {
  return (
    <Link
      to="/accounts"
      className="flex-shrink-0 w-[220px] min-h-[116px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-[#2A2F3F] flex flex-col items-center justify-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-600 transition-colors no-underline"
    >
      <span className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 grid place-items-center text-lg leading-none">＋</span>
      Добавить счёт
    </Link>
  );
}

function Donut({ data }: { data: Array<{ categoryId: string; categoryName: string; categoryColor: string | null; total: string; percentage: string }> }) {
  const total = data.reduce((s, x) => s + Number(x.total), 0);
  const size = 200, stroke = 24;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const gap = 2;
  let offset = 0;
  return (
    <div className="grid place-items-center py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-gray-200 dark:stroke-[#2A2F3F]" strokeWidth={stroke} />
          {data.map((cat) => {
            const frac = total > 0 ? Number(cat.total) / total : 0;
            const len = Math.max(0, C * frac - gap);
            const seg = (
              <circle
                key={cat.categoryId}
                cx={cx} cy={cy} r={r} fill="none"
                stroke={cat.categoryColor ?? '#9CA3AF'}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += C * frac;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Всего</div>
            <div className="text-[22px] font-semibold tracking-tight tnum">{formatMoney(total)}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{data.length} категорий</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isIn = tx.type === 'credit';
  const color = tx.categoryColor ?? '#9CA3AF';
  const title = tx.merchant || tx.description || 'Операция';
  return (
    <tr className="border-t border-gray-200 dark:border-[#262A3A]">
      <td className="py-3 pl-6 pr-3 align-middle">
        <div className="tnum">{formatShortDate(tx.date)}</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">{tx.accountName ?? '—'}</div>
      </td>
      <td className="py-3 px-3 align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-9 h-9 rounded-[10px] grid place-items-center font-semibold text-sm flex-shrink-0"
            style={{ backgroundColor: hexA(color, 0.14), color }}
          >
            {initialOf(tx.categoryName)}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.categoryName ?? '—'}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: hexA(isIn ? INCOME : EXPENSE, 0.12), color: isIn ? INCOME : EXPENSE }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isIn ? INCOME : EXPENSE }} />
          {isIn ? 'Доход' : 'Расход'}
        </span>
      </td>
      <td className="py-3 pl-3 pr-6 align-middle text-right whitespace-nowrap">
        <span
          className="font-semibold tnum"
          style={{ color: isIn ? INCOME : undefined }}
        >
          {isIn ? '+' : '−'}{formatMoney(tx.amount, tx.currency)}
        </span>
      </td>
    </tr>
  );
}

function BudgetCard({ b }: { b: Budget }) {
  const amount = Number(b.amount);
  const spent = Number(b.spent ?? 0);
  const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const remaining = amount - spent;
  const status = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';
  const colorByStatus: Record<typeof status, string> = { success: INCOME, warning: '#F59E0B', error: EXPENSE };
  const labelByStatus: Record<typeof status, string> = { success: 'В норме', warning: 'Близко', error: 'Превышен' };
  const c = colorByStatus[status];
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ backgroundColor: b.categoryColor ?? '#9CA3AF' }} />
        <span className="text-sm font-medium flex-1 truncate">{b.name}</span>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: hexA(c, 0.14), color: c }}
        >
          {labelByStatus[status]}
        </span>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-lg font-semibold tracking-tight tnum">{formatMoney(spent, b.currency)}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tnum">из {formatMoney(amount, b.currency)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-[#262A3A] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: c }}
          />
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 tnum">
        {remaining >= 0 ? (
          <>Осталось <span className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(remaining, b.currency)}</span></>
        ) : (
          <>Превышение <span className="font-medium" style={{ color: EXPENSE }}>{formatMoney(-remaining, b.currency)}</span></>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────

interface MonthEntry { month: string; income: string; expenses: string; net: string; }
interface CatEntry   { categoryId: string; categoryName: string; categoryColor: string | null; total: string; percentage: string; }

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const stepMonth = (d: number) =>
    setMonth(({ y, m }) => {
      let nm = m + d, ny = y;
      if (nm < 0) { nm = 11; ny--; }
      if (nm > 11) { nm = 0; ny++; }
      return { y: ny, m: nm };
    });

  const monthStart = useMemo(() => startOfMonth(new Date(month.y, month.m, 1)), [month]);
  const monthEnd   = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const from = format(monthStart, 'yyyy-MM-dd');
  const to   = format(monthEnd,   'yyyy-MM-dd');

  const { data: accounts } = useAccounts();
  const { data: txPages }  = useTransactions({ from, to });
  const { data: budgets }  = useBudgets();
  const { data: rawSum }   = useReportsMonthlySummary({ from, to });
  const { data: rawCat }   = useReportsSpendingByCategory({ from, to });

  const accList: Account[] = accounts ?? [];
  const months: MonthEntry[] = (Array.isArray(rawSum) ? rawSum : []) as MonthEntry[];
  const cats:   CatEntry[]   = (Array.isArray(rawCat) ? rawCat : []) as CatEntry[];
  const topCats = cats.slice(0, 6);

  const totalBalance  = Number(sumMoney(accList.filter((a) => a.currency === 'RUB').map((a) => a.balance)));
  const totalIncome   = Number(sumMoney(months.map((m) => m.income)));
  const totalExpenses = Number(sumMoney(months.map((m) => m.expenses)));
  const totalNet      = totalIncome - totalExpenses;

  const SAVINGS_GOAL = 80000;
  const recentTx: Transaction[] = (txPages?.pages?.[0]?.data ?? []).slice(0, 8);
  const topBudgets: Budget[] = (budgets ?? []).slice(0, 4);

  const firstName = (user?.fullName?.split(' ')[0]) || 'друг';

  return (
    <div className="px-4 md:px-8 py-6 md:py-7 max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <header className="flex flex-wrap items-center gap-3 md:gap-6 mb-6">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Привет, {firstName} 👋</div>
          <h1 className="m-0 text-2xl md:text-[28px] font-semibold tracking-tight">Главная</h1>
        </div>

        <div className="md:ml-auto flex items-center gap-3 flex-wrap">
          <MonthPill date={month} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} />

          <button
            type="button"
            aria-label="Уведомления"
            className="relative w-10 h-10 rounded-xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] grid place-items-center hover:bg-gray-50 dark:hover:bg-[#1F2331]"
          >
            <IconBell />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-brand-600 ring-2 ring-white dark:ring-[#181B26]" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium flex items-center gap-1.5"
            style={{ boxShadow: '0 6px 16px -8px #6366F1' }}
          >
            <span className="text-lg leading-none -mt-0.5">+</span>
            Добавить операцию
          </button>
        </div>
      </header>

      {/* ─── Row 1: stat cards ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Баланс"
          value={formatMoney(totalBalance)}
          sub={`${accList.length} ${accList.length === 1 ? 'счёт' : accList.length < 5 ? 'счёта' : 'счетов'}`}
          tintClass="bg-[#EEF0FF] dark:bg-[#1A2230]"
          accent={ACCENT} icon={<IconWallet />}
        />
        <StatCard
          label="Доходы"
          value={`+${formatMoney(totalIncome)}`}
          sub="за месяц"
          valueClassName="text-income"
          tintClass="bg-[#E8F7EE] dark:bg-[#142421]"
          accent={INCOME} icon={<IconChart />}
        />
        <StatCard
          label="Расходы"
          value={`−${formatMoney(totalExpenses)}`}
          sub="за месяц"
          valueClassName="text-expense"
          tintClass="bg-[#FDECEC] dark:bg-[#2A1A1F]"
          accent={EXPENSE} icon={<IconChart />}
        />
        <StatCard
          label="Сбережения"
          value={`${totalNet >= 0 ? '+' : '−'}${formatMoney(Math.abs(totalNet))}`}
          sub={`цель ${formatMoney(SAVINGS_GOAL)}`}
          valueClassName="text-brand-600"
          tintClass="bg-[#EEEBFB] dark:bg-[#1B1B30]"
          accent={ACCENT} icon={<IconChart />}
          progress={SAVINGS_GOAL > 0 ? totalNet / SAVINGS_GOAL : 0}
        />
      </section>

      {/* ─── Row 2: accounts strip ─── */}
      <section className="bg-white dark:bg-[#181B26] rounded-2xl shadow-soft mb-5">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Счета</h2>
          <Link to="/accounts" className="text-sm font-medium text-brand-600 hover:underline">Управление счетами →</Link>
        </div>
        <div className="flex gap-3 px-5 pb-5 overflow-x-auto">
          {!accounts ? (
            <Skeleton className="w-[220px] h-[116px] rounded-2xl" />
          ) : accList.length === 0 ? (
            <AddAccountCard />
          ) : (
            <>
              {accList.map((acc) => <AccountCard key={acc.id} acc={acc} />)}
              <AddAccountCard />
            </>
          )}
        </div>
      </section>

      {/* ─── Row 3: transactions + donut ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 mb-5 items-start">
        {/* Transactions */}
        <div className="bg-white dark:bg-[#181B26] rounded-2xl shadow-soft overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4">
            <h2 className="text-[17px] font-semibold tracking-tight">Последние операции</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] px-2.5 py-0.5 rounded-full">
              {recentTx.length}
            </span>
            <Link to="/transactions" className="ml-auto text-sm font-medium text-brand-600 hover:underline">Все операции →</Link>
          </div>
          {recentTx.length === 0 ? (
            <div className="px-6 pb-8 text-sm text-gray-500 dark:text-gray-400 text-center">
              За этот месяц операций пока нет
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider font-medium text-gray-500 dark:text-gray-400">
                  <th className="text-left py-3 pl-6 pr-3 font-medium">Дата</th>
                  <th className="text-left py-3 px-3 font-medium">Категория</th>
                  <th className="text-left py-3 px-3 font-medium">Тип</th>
                  <th className="text-right py-3 pl-3 pr-6 font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>{recentTx.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</tbody>
            </table>
          )}
        </div>

        {/* Donut */}
        <div className="bg-white dark:bg-[#181B26] rounded-2xl shadow-soft p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold tracking-tight">Расходы по категориям</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{MONTHS_RU[month.m]}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">Топ-6 категорий месяца</div>

          {topCats.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Нет данных по расходам
            </div>
          ) : (
            <>
              <Donut data={topCats} />
              <ul className="list-none p-0 mt-5 flex flex-col gap-2.5">
                {topCats.map((cat) => (
                  <li key={cat.categoryId} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ backgroundColor: cat.categoryColor ?? '#9CA3AF' }} />
                    <span className="text-sm flex-1 min-w-0 truncate">{cat.categoryName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tnum w-9 text-right">
                      {Math.round(Number(cat.percentage))}%
                    </span>
                    <span className="text-sm font-medium tnum w-[88px] text-right whitespace-nowrap">
                      {formatMoney(cat.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* ─── Row 4: budgets ─── */}
      <section className="bg-white dark:bg-[#181B26] rounded-2xl shadow-soft p-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[17px] font-semibold tracking-tight">Бюджеты на {MONTHS_RU[month.m].toLowerCase()}</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] px-2.5 py-0.5 rounded-full">
            {topBudgets.length}
          </span>
          <Link to="/budgets" className="ml-auto text-sm font-medium text-brand-600 hover:underline">Все бюджеты →</Link>
        </div>
        {topBudgets.length === 0 ? (
          <div className="py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
            Бюджеты не созданы. <Link to="/budgets" className="text-brand-600 hover:underline">Создать первый →</Link>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topBudgets.map((b) => <BudgetCard key={b.id} b={b} />)}
          </div>
        )}
      </section>
    </div>
  );
}
