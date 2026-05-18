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

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#6366f1',
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

function SummaryStatCard({
  label,
  value,
  currency,
  color,
}: {
  label: string;
  value: string | number;
  currency?: string;
  color?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || 'text-gray-900 dark:text-gray-100'}`}>
        {currency ? formatMoney(String(value), currency) : value}
      </p>
    </Card>
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
        <SummaryStatCard label="Доходы" value={totalIncome.toFixed(2)} currency="RUB" color="text-green-600 dark:text-green-400" />
        <SummaryStatCard label="Расходы" value={totalExpenses.toFixed(2)} currency="RUB" color="text-red-600 dark:text-red-400" />
        <SummaryStatCard label="Чистые сбережения" value={netSavings.toFixed(2)} currency="RUB" color={netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />
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
                <Line type="monotone" dataKey="net" name="Сбережения" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
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
            stroke="#3b82f6"
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
            <Bar dataKey="budget" name="Бюджет" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Отчёты</h1>

        {/* Date range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setPreset(p.key); setUseCustom(false); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  !useCustom && preset === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div role="tablist" className="flex border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
