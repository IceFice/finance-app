import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useReportsMonthlySummary, useReportsSpendingByCategory } from '@/hooks/useReports';
import { Card } from '@/components/ui/Card';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, formatDate, cn, sumMoney } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const now = new Date();
const from = format(startOfMonth(now), 'yyyy-MM-dd');
const to = format(endOfMonth(now), 'yyyy-MM-dd');
const COLORS = ['#3B82F6','#EF4444','#22C55E','#F59E0B','#8B5CF6','#EC4899'];

interface SummaryCardProps { label: string; value: string; color?: string; }
function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color ?? 'text-gray-900 dark:text-white')}>{value}</p>
    </Card>
  );
}

// monthly-summary and spending-by-category return JSON ARRAYS (the service's
// extra .totals/.grandTotal props are dropped by JSON.stringify on arrays).
interface MonthEntry { month: string; income: string; expenses: string; net: string; }
interface CatEntry { categoryId: string; categoryName: string; categoryColor: string | null; total: string; percentage: string; }

export default function DashboardPage() {
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: txPages } = useTransactions({ from, to });
  const { data: budgets, isLoading: budLoading } = useBudgets();
  const { data: rawSummary, isLoading: sumLoading } = useReportsMonthlySummary({ from, to });
  const { data: rawCat } = useReportsSpendingByCategory({ from, to });
  const months = (Array.isArray(rawSummary) ? rawSummary : []) as MonthEntry[];
  const totalIncome = sumMoney(months.map((m) => m.income));
  const totalExpenses = sumMoney(months.map((m) => m.expenses));
  const totalNet = sumMoney([totalIncome, -Number(totalExpenses)]);
  const pieData = ((Array.isArray(rawCat) ? rawCat : []) as CatEntry[])
    .slice(0, 6)
    .map((e) => ({ ...e, value: Number(e.total) || 0 }));
  const totalBalance = sumMoney((accounts ?? []).map((a) => a.balance));
  const recentTx = txPages?.pages[0]?.data.slice(0, 8) ?? [];
  const topBudgets = budgets?.slice(0, 3) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Главная</h1>
      {sumLoading || accLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      ) : (<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Общий баланс" value={formatMoney(totalBalance)} />
        <SummaryCard label="Доходы" value={formatMoney(totalIncome)} color="text-green-600 dark:text-green-400" />
        <SummaryCard label="Расходы" value={formatMoney(totalExpenses)} color="text-red-600 dark:text-red-400" />
        <SummaryCard label="Сбережения" value={formatMoney(totalNet)}
          color={Number(totalNet) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />
      </div>)}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Счета</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {accLoading ? <Skeleton className="w-40 h-24 rounded-xl" /> : accounts?.map(acc => (
              <div key={acc.id} className="flex-shrink-0 w-44 p-4 rounded-xl text-white" style={{ background: acc.color ?? '#3B82F6' }}>
                <p className="text-xs opacity-80 truncate">{acc.name}</p>
                <p className="text-lg font-bold mt-1">{formatMoney(acc.balance, acc.currency)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Категории</h2>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={150}><PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                {pieData.map((e, i) => <Cell key={e.categoryId} fill={e.categoryColor ?? COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => formatMoney(String(v))} />
            </PieChart></ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Последние операции</h2>
          <ul className="space-y-3">
            {recentTx.map(tx => (
              <li key={tx.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm bg-gray-200 dark:bg-gray-700">{tx.categoryName?.slice(0,1) ?? '?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchant ?? tx.description ?? 'Операция'}</p>
                  <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                </div>
                <span className={cn('text-sm font-semibold', tx.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                  {tx.type === 'credit' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Бюджеты</h2>
          {budLoading ? <Skeleton className="h-32" /> : (
            <ul className="space-y-4">
              {topBudgets.map(b => {
                const pct = parseFloat(b.amount) > 0 ? (parseFloat(b.spent) / parseFloat(b.amount)) * 100 : 0;
                return (<li key={b.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{b.name}</span>
                    <Badge variant={pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success'}>{pct.toFixed(0)}%</Badge>
                  </div>
                  <ProgressBar value={pct} />
                  <p className="text-xs text-gray-500 mt-1">{formatMoney(b.spent)} / {formatMoney(b.amount)}</p>
                </li>);
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}