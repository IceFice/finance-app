import { useState } from 'react';
import {
  useReportsMonthlySummary,
  useReportsSpendingByCategory,
  useReportsCashFlow,
  useReportsBudgetVsActual,
} from '../../hooks/useReports';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { QueryError } from '../../components/ui/QueryError';
import { formatMoney } from '../../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TabKey = 'overview' | 'category' | 'cashflow' | 'budget';
type PresetKey = 'this_month' | 'last_3_months' | 'this_year';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Обзор' },
  { key: 'category', label: 'По категориям' },
  { key: 'cashflow', label: 'Денежный поток' },
  { key: 'budget', label: 'Бюджет vs Факт' },
];

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'this_month', label: 'Этот месяц' },
  { key: 'last_3_months', label: 'Последние 3 месяца' },
  { key: 'this_year', label: 'Этот год' },
];

// Brand-first palette. Inco/expense semantic colors are reused throughout
// so they keep their meaning even outside the income/expense view.
const CHART_COLORS = [
  '#6366F1', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#14B8A6', '#EC4899', '#4F46E5',
];

function getPresetDates(preset: PresetKey): { from: string; to: string } {
  const now = new Date();
  if (preset === 'this_month') {
    return {
      from: format(startOfMonth(now), 'yyyy-MM-dd'),
      to: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  }
  if (preset === 'last_3_months') {
    return {
      from: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),
      to: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  }
  return {
    from: format(startOfYear(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

// Tinted v3 stat card with icon chip + sub line. Sticks to the same shape
// as Dashboard/Operations/Budgets stat cards so the four pages feel like
// one product, not four.
function SummaryStatCard({
  label,
  value,
  currency,
  valueClass,
  tintClass,
  accentHex,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  currency?: string;
  valueClass?: string;
  tintClass?: string;
  accentHex?: string;
  sub?: string;
  icon?: string;
}) {
  const displayValue = currency ? formatMoney(String(value), currency) : value;
  return (
    <div className={`rounded-2xl p-4 min-h-[112px] flex flex-col gap-2 shadow-soft ${tintClass ?? 'bg-white dark:bg-[#181B26]'}`}>
      <div className="flex items-center gap-2">
        {accentHex && (
          <span
            className="w-7 h-7 rounded-lg grid place-items-center text-[14px]"
            style={{ backgroundColor: `${accentHex}28`, color: accentHex }}
            aria-hidden="true"
          >
            {icon ?? '•'}
          </span>
        )}
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-[22px] font-semibold leading-tight tracking-tight tnum truncate ${valueClass || 'text-gray-900 dark:text-white'}`}>
        {displayValue}
      </p>
      {sub && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-auto">{sub}</p>}
    </div>
  );
}

function OverviewTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading, isError, refetch } = useReportsMonthlySummary({ from, to });

  interface MonthlyEntry {
    month: string;
    income: string | number;
    expenses: string | number;
    net: string | number;
    currency?: string;
  }

  const months: MonthlyEntry[] = (data as MonthlyEntry[]) ?? [];

  const totalIncome = months.reduce((s: number, m: MonthlyEntry) => s + parseFloat(String(m.income ?? 0)), 0);
  const totalExpenses = months.reduce((s: number, m: MonthlyEntry) => s + parseFloat(String(m.expenses ?? 0)), 0);
  const netSavings = totalIncome - totalExpenses;

  if (isError) {
    return <QueryError message="Не удалось загрузить отчёт" onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const chartData = months.map((m: MonthlyEntry) => ({
    month: m.month,
    income: parseFloat(String(m.income ?? 0)),
    expenses: parseFloat(String(m.expenses ?? 0)),
    net: parseFloat(String(m.net ?? 0)),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryStatCard
          label="Доходы" value={totalIncome.toFixed(2)} currency="RUB"
          tintClass="bg-[#E8F7EE] dark:bg-[#142421]"
          accentHex="#22C55E" valueClass="text-income"
          sub={`за ${months.length || 0} мес.`} icon="↓"
        />
        <SummaryStatCard
          label="Расходы" value={totalExpenses.toFixed(2)} currency="RUB"
          tintClass="bg-[#FDECEC] dark:bg-[#2A1A1F]"
          accentHex="#EF4444" valueClass="text-expense"
          sub={`за ${months.length || 0} мес.`} icon="↑"
        />
        <SummaryStatCard
          label="Чистые сбережения" value={netSavings.toFixed(2)} currency="RUB"
          tintClass="bg-[#EEEBFB] dark:bg-[#1B1B30]"
          accentHex="#6366F1"
          valueClass={netSavings >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-expense'}
          sub={netSavings >= 0 ? 'положительные' : 'отрицательные'} icon="🐷"
        />
      </div>

      {chartData.length === 0 ? (
        <Card className="py-16 flex flex-col items-center text-gray-400">
          <span className="text-4xl mb-2">📈</span>
          <p>Нет данных за выбранный период</p>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Доходы и расходы по месяцам</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMoney(v.toFixed(2), 'RUB')} />
                <Legend />
                <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Расходы" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Чистые сбережения</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatMoney(v.toFixed(2), 'RUB')} />
                <Line type="monotone" dataKey="net" name="Сбережения" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

function CategoryTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading, isError, refetch } = useReportsSpendingByCategory({ from, to });

  interface CategoryEntry {
    category_name: string;
    category_color?: string;
    total: string | number;
    type?: string;
    currency?: string;
  }

  const categories: CategoryEntry[] = (data as CategoryEntry[]) ?? [];
  const total = categories.reduce((s: number, c: CategoryEntry) => s + parseFloat(String(c.total ?? 0)), 0);

  if (isError) {
    return <QueryError message="Не удалось загрузить отчёт" onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="py-16 flex flex-col items-center text-gray-400">
        <span className="text-4xl mb-2">🍩</span>
        <p>Нет данных за выбранный период</p>
      </Card>
    );
  }

  const pieData = categories.map((c: CategoryEntry, i: number) => ({
    name: c.category_name,
    value: parseFloat(String(c.total ?? 0)),
    color: c.category_color || CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Расходы по категориям</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ResponsiveContainer width={260} height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v.toFixed(2), 'RUB')} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-2 w-full">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-700 dark:text-gray-300">{entry.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatMoney(entry.value.toFixed(2), 'RUB')}</span>
                  <span className="text-gray-400 ml-2 text-xs">{total > 0 ? Math.round((entry.value / total) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Категория</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Сумма</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Доля</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c: CategoryEntry, i: number) => {
              const amount = parseFloat(String(c.total ?? 0));
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: c.category_color || CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {c.category_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatMoney(amount.toFixed(2), 'RUB')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CashFlowTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading, isError, refetch } = useReportsCashFlow({ from, to, granularity: 'month' });

  interface CashFlowEntry {
    period: string;
    income: string | number;
    expenses: string | number;
    net: string | number;
  }

  const periods: CashFlowEntry[] = (data as CashFlowEntry[]) ?? [];

  if (isError) {
    return <QueryError message="Не удалось загрузить отчёт" onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  if (periods.length === 0) {
    return (
      <Card className="py-16 flex flex-col items-center text-gray-400">
        <span className="text-4xl mb-2">📉</span>
        <p>Нет данных за выбранный период</p>
      </Card>
    );
  }

  const chartData = periods.map((p: CashFlowEntry) => ({
    period: p.period,
    income: parseFloat(String(p.income ?? 0)),
    expenses: parseFloat(String(p.expenses ?? 0)),
    net: parseFloat(String(p.net ?? 0)),
  }));

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Денежный поток</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: number) => formatMoney(v.toFixed(2), 'RUB')} />
          <Legend />
          <Area
            type="monotone"
            dataKey="income"
            name="Доходы"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#incomeGradient)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Расходы"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#expenseGradient)"
          />
          <Line
            type="monotone"
            dataKey="net"
            name="Чистый поток"
            stroke="#6366F1"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function BudgetAnalysisTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading, isError, refetch } = useReportsBudgetVsActual({ from, to });

  interface BudgetEntry {
    budget_name: string;
    budget_amount: string | number;
    actual_spent: string | number;
    category_name?: string;
  }

  const budgets: BudgetEntry[] = (data as BudgetEntry[]) ?? [];

  if (isError) {
    return <QueryError message="Не удалось загрузить отчёт" onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  if (budgets.length === 0) {
    return (
      <Card className="py-16 flex flex-col items-center text-gray-400">
        <span className="text-4xl mb-2">📊</span>
        <p>Нет данных о бюджетах за выбранный период</p>
      </Card>
    );
  }

  const chartData = budgets.map((b: BudgetEntry) => ({
    name: b.budget_name || b.category_name || 'Бюджет',
    budget: parseFloat(String(b.budget_amount ?? 0)),
    actual: parseFloat(String(b.actual_spent ?? 0)),
  }));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Бюджет vs Фактические расходы</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => formatMoney(v.toFixed(2), 'RUB')} />
            <Legend wrapperStyle={{ paddingTop: '8px' }} />
            <Bar dataKey="budget" name="Бюджет" fill="#6366F1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Фактически" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Бюджет</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Лимит</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Факт</th>
              <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b: BudgetEntry, i: number) => {
              const budget = parseFloat(String(b.budget_amount ?? 0));
              const actual = parseFloat(String(b.actual_spent ?? 0));
              const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
              const isOver = actual > budget;
              return (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {b.budget_name || b.category_name || 'Бюджет'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                    {formatMoney(budget.toFixed(2), 'RUB')}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isOver ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {formatMoney(actual.toFixed(2), 'RUB')}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isOver ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [preset, setPreset] = useState<PresetKey>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const { from, to } = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : getPresetDates(preset);

  // Human-readable range like "1 мар 2026 — 31 мая 2026" for the right side
  // of the date-range card.
  const fmtRange = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const M = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  };
  const tabIcons: Record<TabKey, string> = {
    overview: '📈', category: '🍩', cashflow: '📊', budget: '🎯',
  };

  return (
    <div className="px-4 md:px-8 py-6 md:py-7 max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">
            Аналитика по периодам и категориям
          </div>
          <h1 className="m-0 text-2xl md:text-[28px] font-semibold tracking-tight">Отчёты</h1>
        </div>
      </div>

      {/* ── Date-range card ── */}
      <Card className="p-3 md:p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
            Период
          </span>
          <div className="inline-flex items-center bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-full p-1 gap-1">
            {PRESETS.map((p) => {
              const active = !useCustom && preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => { setPreset(p.key); setUseCustom(false); }}
                  className={
                    'px-3.5 h-8 rounded-full text-sm transition-colors ' +
                    (active
                      ? 'bg-brand-600 text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <span className="text-sm text-gray-400">или</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="С"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }}
              className="h-9 rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              aria-label="По"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }}
              className="h-9 rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-gray-900 dark:text-gray-100 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400 tnum">
            {fmtRange(from)} — {fmtRange(to)}
          </div>
        </div>
      </Card>

      {/* ── Tab strip with accent underline ── */}
      <div role="tablist" className="flex gap-1 border-b border-gray-200 dark:border-[#262A3A]">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-3 text-sm transition-colors inline-flex items-center gap-2 ${
                active
                  ? 'text-gray-900 dark:text-white font-semibold'
                  : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-[15px]" aria-hidden="true">{tabIcons[tab.key]}</span>
              {tab.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-3 right-3 -bottom-px h-[3px] rounded-full bg-brand-600"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab from={from} to={to} />}
        {activeTab === 'category' && <CategoryTab from={from} to={to} />}
        {activeTab === 'cashflow' && <CashFlowTab from={from} to={to} />}
        {activeTab === 'budget' && <BudgetAnalysisTab from={from} to={to} />}
      </div>
    </div>
  );
}
