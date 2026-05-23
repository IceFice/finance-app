// ════════════════════════════════════════════════════════════════════════════
// Счета — hi-fi v3
// Mirrors Babkoschet/app-accounts.jsx:
//   - 4-card stat strip (total / foreign / savings / month net)
//   - master-detail (BigAccountCard grid + sticky detail panel)
//   - allocation donut by account type
//   - quick transfer form (POST /transactions/transfer)
// Preserves the existing CRUD modals (create / edit / delete) and aria-labels.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, Account,
} from '@/hooks/useAccounts';
import { useTransactions, useCreateTransfer, Transaction } from '@/hooks/useTransactions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { QueryError } from '@/components/ui/QueryError';
import { formatMoney, sumMoney, cn } from '@/lib/utils';

// ─── Constants (mirrors design source) ─────────────────────────────────────
const INCOME = '#22C55E';
const EXPENSE = '#EF4444';
const ACCENT = '#6366F1';
const SAVINGS_GOAL = 80000;

const ACCOUNT_TYPES = [
  { value: 'checking',    label: 'Текущий счёт' },
  { value: 'savings',     label: 'Накопительный' },
  { value: 'credit_card', label: 'Кредитная карта' },
  { value: 'cash',        label: 'Наличные' },
  { value: 'investment',  label: 'Инвестиции' },
  { value: 'loan',        label: 'Кредит' },
] as const;
const TYPE_LABEL: Record<string, string> = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t.label]));
const TYPE_ICON: Record<string, string> = {
  checking: '🏦', savings: '🐖', credit_card: '💳',
  cash: '💵', investment: '📈', loan: '📉',
};

// ─── Pure helpers ──────────────────────────────────────────────────────────
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
function compactMoney(n: number, currency = 'RUB'): string {
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_000_000) s = (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  else if (abs >= 1000) s = (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  else s = String(Math.round(n));
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
  return currency === 'RUB' ? `${s} ${sym}` : `${sym}${s}`;
}
function initialOf(s: string | null | undefined): string {
  return (s || '?').trim().slice(0, 1).toUpperCase();
}
function shortDate(iso: string): string {
  const MONTHS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
// Deterministic synthetic balance sparkline so the visual is stable across
// renders without persisting historical balances yet.
function syntheticPoints(seed: string, end: number): number[] {
  const pts: number[] = [];
  let v = end;
  for (let i = 11; i >= 0; i--) {
    const s = (seed.charCodeAt(1 % seed.length) * 13 + i * 7) % 9;
    const drift = (i + 1) * (end * 0.012) * ((s % 5) - 2) / 4;
    v = v - drift;
    pts.unshift(Math.max(end * 0.55, v));
  }
  return pts;
}

// ─── Small SVG primitives ──────────────────────────────────────────────────
function I({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
const IconWallet  = () => <I><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" /><path d="M22 11h-5a2 2 0 1 0 0 4h5z" /></I>;
const IconArrDown = () => <I><path d="M12 5v14M5 13l7 7 7-7" /></I>;
const IconArrUp   = () => <I><path d="M12 19V5M5 11l7-7 7 7" /></I>;
const IconPig     = () => <I><path d="M16 4l1 3h3v4l-2 1a6 6 0 0 1-6 6H8a5 5 0 0 1-5-5v-1a5 5 0 0 1 5-5h6" /><circle cx="16" cy="11" r="0.6" fill="currentColor" /><path d="M5 18v2M11 18v2" /></I>;
const IconTransfer= () => <I><path d="M7 8h12M7 8l3-3M7 8l3 3" /><path d="M17 16H5m12 0-3-3m3 3-3 3" /></I>;
const IconEye     = () => <I><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></I>;
const IconEyeOff  = () => <I><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.4 4.1" /><path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6c1.6 0 3.1-.3 4.5-.9" /><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" /></I>;
const IconEdit    = () => <I><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M14 6l4 4" /></I>;
const IconTrash   = () => <I><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></I>;
const IconChevDn  = () => <I><path d="M6 9l6 6 6-6" /></I>;

// ─── Sparkline (matches shell-v3.jsx) ──────────────────────────────────────
function Sparkline({ color, points, w = 80, h = 26 }: { color: string; points: number[]; w?: number; h?: number }) {
  const max = Math.max(...points), min = Math.min(...points);
  const range = (max - min) || 1;
  const step = w / (points.length - 1);
  const ys = points.map(p => h - ((p - min) / range) * h * 0.85 - h * 0.08);
  const path = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = 'g' + color.replace('#', '') + Math.round(w * h).toString(36);
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

// ─── StatCard (tinted, matches Dashboard v3) ───────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tintClass: string;
  accent: string;
  valueClass?: string;
  icon: React.ReactNode;
  progress?: number;
  spark?: { color: string; points: number[] };
}
function StatCard({ label, value, sub, tintClass, accent, valueClass, icon, progress, spark }: StatCardProps) {
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
      <div className={cn('text-[28px] font-semibold tracking-[-0.02em] tabular-nums leading-tight mt-0.5 truncate', valueClass)}>
        {value}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="text-[12px] text-gray-500 dark:text-gray-400 truncate">{sub}</div>
        {progress !== undefined ? (
          <div className="flex-1 h-1.5 rounded-full overflow-hidden ml-3" style={{ background: hexA(accent, 0.18) }}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, progress * 100)}%`, background: accent }} />
          </div>
        ) : spark ? <Sparkline color={spark.color} points={spark.points} /> : null}
      </div>
    </div>
  );
}

// ─── BigAccountCard — gradient hero + bottom strip ─────────────────────────
interface AccountStats {
  inSum: number; outSum: number; txCount: number;
  txs: Transaction[]; points: number[];
}
function BigAccountCard({
  acc, stats, selected, onClick, hide,
}: {
  acc: Account; stats: AccountStats; selected: boolean; onClick: () => void; hide: boolean;
}) {
  const bg = acc.color || '#3B82F6';
  const typeLabel = TYPE_LABEL[acc.type] || acc.type;
  return (
    <button
      onClick={onClick}
      aria-label={`Выбрать счёт ${acc.name}`}
      className="text-left p-0 border-0 bg-transparent rounded-2xl transition-transform hover:-translate-y-0.5 focus:outline-none"
      style={{
        outline: selected ? `2px solid ${ACCENT}` : '2px solid transparent',
        outlineOffset: 2,
      }}
    >
      {/* Gradient hero */}
      <div
        className="relative overflow-hidden rounded-2xl text-white pt-4 px-4 pb-3.5"
        style={{
          background: `linear-gradient(150deg, ${bg}, ${shade(bg, -22)})`,
          boxShadow: `0 12px 28px -18px ${hexA(bg, 0.7)}`,
        }}
      >
        <span aria-hidden="true" className="absolute -top-7 -right-7 w-[130px] h-[130px] rounded-full bg-white/[0.08]" />
        <span aria-hidden="true" className="absolute -bottom-10 -left-2.5 w-[110px] h-[110px] rounded-full bg-white/[0.05]" />
        <div className="relative flex items-center justify-between mb-7">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[10px] bg-white/[0.16] grid place-items-center text-base">
              {acc.icon || TYPE_ICON[acc.type] || '🏦'}
            </span>
            <div>
              <div className="text-sm font-semibold tracking-tight">{acc.name}</div>
              <div className="text-[11px] opacity-80 uppercase tracking-[0.04em] mt-0.5">
                {typeLabel} · {acc.currency}
              </div>
            </div>
          </div>
        </div>
        <div className="relative text-[11px] opacity-75">Доступно</div>
        <div className="relative text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          {hide ? '••••••' : formatMoney(acc.balance, acc.currency)}
        </div>
      </div>

      {/* Bottom strip with month in/out + sparkline */}
      <div className="bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] border-t-0 rounded-b-2xl px-4 py-3 -mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">За месяц</div>
          <div className="flex items-center gap-2.5 tabular-nums">
            {stats.inSum > 0 && (
              <span className="text-[13px] font-medium" style={{ color: INCOME }}>
                +{compactMoney(stats.inSum, acc.currency)}
              </span>
            )}
            {stats.outSum > 0 && (
              <span className="text-[13px] font-medium" style={{ color: EXPENSE }}>
                −{compactMoney(stats.outSum, acc.currency)}
              </span>
            )}
            {stats.txCount === 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Без активности</span>
            )}
          </div>
        </div>
        {stats.txCount > 0 && <Sparkline color={acc.color || ACCENT} points={stats.points} w={70} h={26} />}
      </div>
    </button>
  );
}

function AddAccountTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[198px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-[#262A3A] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] flex flex-col items-center justify-center gap-2.5"
    >
      <span className="w-11 h-11 rounded-[14px] grid place-items-center text-2xl"
        style={{ background: hexA(ACCENT, 0.14), color: ACCENT }}>+</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Добавить счёт</span>
      <span className="text-xs">Карта, наличные, накопления…</span>
    </button>
  );
}

// ─── Allocation donut (by type) ────────────────────────────────────────────
interface TypeSlice { type: string; label: string; total: number; pct: number; color: string }
function AllocationDonut({ items, totalRub, hide }: { items: TypeSlice[]; totalRub: number; hide: boolean }) {
  const size = 200, stroke = 24;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const gap = 2;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-gray-100 dark:stroke-[#2A2F3F]" strokeWidth={stroke} />
        {items.map(b => {
          const frac = totalRub > 0 ? b.total / totalRub : 0;
          const len = Math.max(0, C * frac - gap);
          const dash = `${len} ${C - len}`;
          const seg = (
            <circle key={b.type} cx={cx} cy={cy} r={r} fill="none"
              stroke={b.color} strokeWidth={stroke}
              strokeDasharray={dash} strokeDashoffset={-offset} />
          );
          offset += C * frac;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-[0.04em]">Всего</div>
          <div className="text-xl font-semibold tracking-[-0.02em] tabular-nums">
            {hide ? '••••••' : compactMoney(Math.round(totalRub))}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{items.length} типов</div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick transfer — custom AccountSelect ─────────────────────────────────
function AccountSelect({
  accounts, value, onChange, hide,
}: { accounts: Account[]; value: string; onChange: (id: string) => void; hide: boolean }) {
  const acc = accounts.find(a => a.id === value) || accounts[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  if (!acc) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3 h-14 bg-gray-50 dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] rounded-xl text-left text-gray-900 dark:text-gray-100"
      >
        <span
          className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${acc.color ?? ACCENT}, ${shade(acc.color ?? ACCENT, -22)})` }}
        >
          {acc.icon || TYPE_ICON[acc.type] || '🏦'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">{acc.name}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
            {hide ? '••••••' : formatMoney(acc.balance, acc.currency)}
          </div>
        </div>
        <span className="text-gray-400"><IconChevDn /></span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-xl shadow-soft z-10 p-1 max-h-80 overflow-y-auto"
        >
          {accounts.map(a => (
            <li key={a.id}>
              <button
                type="button"
                role="option"
                aria-selected={a.id === value}
                onClick={() => { onChange(a.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left',
                  a.id === value ? 'bg-gray-50 dark:bg-[#1F2331]' : 'hover:bg-gray-50 dark:hover:bg-[#1F2331]',
                )}
              >
                <span
                  className="w-6 h-6 rounded-lg grid place-items-center text-white text-xs flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${a.color ?? ACCENT}, ${shade(a.color ?? ACCENT, -22)})` }}
                >
                  {a.icon || TYPE_ICON[a.type] || '🏦'}
                </span>
                <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{a.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {hide ? '••••' : compactMoney(Number(a.balance), a.currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── CRUD form (visual refresh, same fields and aria-labels) ───────────────
const accountSchema = z.object({
  name: z.string().min(1, 'Укажите название').max(100, 'Максимум 100 символов'),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  currency: z.string().length(3),
  balance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Некорректная сумма'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Цвет в формате #RRGGBB').optional().or(z.literal('')),
  icon: z.string().max(50).optional(),
});
type AccountFormData = z.infer<typeof accountSchema>;

function AccountForm({
  initial, onSubmit, isLoading,
}: { initial?: Account; onSubmit: (d: AccountFormData) => Promise<void>; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: initial
      ? { name: initial.name, type: initial.type as AccountFormData['type'],
          currency: initial.currency, balance: initial.balance,
          color: initial.color ?? '', icon: initial.icon ?? '' }
      : { type: 'checking', currency: 'RUB', balance: '0.00', color: '' },
  });
  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
      <div>
        <label htmlFor="acc-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
        <input id="acc-name" {...register('name')} type="text" placeholder="Например: Карта Сбербанк" className={inputCls} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="acc-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
          <select id="acc-type" {...register('type')} className={inputCls}>
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="acc-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Валюта</label>
          <select id="acc-currency" {...register('currency')} className={inputCls}>
            <option value="RUB">RUB ₽</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="acc-balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {initial ? 'Баланс' : 'Начальный баланс'}
          </label>
          <input id="acc-balance" {...register('balance')} type="number" step="0.01" placeholder="0.00" className={inputCls} />
          {errors.balance && <p className="mt-1 text-xs text-red-500">{errors.balance.message}</p>}
        </div>
        <div>
          <label htmlFor="acc-icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Иконка (эмодзи)</label>
          <input id="acc-icon" {...register('icon')} type="text" maxLength={50} placeholder="💳" className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="acc-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цвет</label>
        <input id="acc-color" {...register('color')} type="color"
          className="h-10 w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1 cursor-pointer" />
        {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color.message}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать счёт'}
        </Button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════
export default function AccountsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hide, setHide] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [xferFrom, setXferFrom] = useState<string>('');
  const [xferTo, setXferTo] = useState<string>('');
  const [xferAmount, setXferAmount] = useState('');
  const [xferError, setXferError] = useState<string | null>(null);
  const [xferOK, setXferOK] = useState(false);

  const { data: accountsData, isLoading, isError, refetch } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const transferMutation = useCreateTransfer();

  // Stable reference so downstream useMemo/useEffect don't fire each render
  const accounts = useMemo(() => accountsData ?? [], [accountsData]);

  // Current month range for per-account stats
  const now = new Date();
  const from = format(startOfMonth(now), 'yyyy-MM-dd');
  const to = format(endOfMonth(now), 'yyyy-MM-dd');
  const { data: txData } = useTransactions({ from, to });
  const transactions = useMemo(
    () => txData?.pages.flatMap(p => p.data) ?? [],
    [txData],
  );

  // Per-account stats (in/out/txs/sparkline) for the current month
  const accountStats: Record<string, AccountStats> = useMemo(() => {
    const map: Record<string, AccountStats> = {};
    for (const acc of accounts) {
      const txs = transactions.filter(t => t.accountId === acc.id);
      const inSum  = txs.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
      const outSum = txs.filter(t => t.type === 'debit') .reduce((s, t) => s + Number(t.amount), 0);
      map[acc.id] = {
        inSum, outSum, txCount: txs.length, txs,
        points: syntheticPoints(acc.id || 'x', Number(acc.balance) || 1),
      };
    }
    return map;
  }, [accounts, transactions]);

  // Stat strip aggregates (RUB-only — currency is fixed across the product)
  const totalRub = Number(sumMoney(accounts.map(a => a.balance)));
  const totalSavings = Number(sumMoney(accounts.filter(a => a.type === 'savings').map(a => a.balance)));
  const monthIn  = transactions.filter(t => t.type === 'credit')
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthOut = transactions.filter(t => t.type === 'debit')
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthNet = monthIn - monthOut;

  // Allocation by account type — sums balances per type and computes share
  const byType: TypeSlice[] = useMemo(() => {
    const m = new Map<string, { total: number; color: string }>();
    for (const a of accounts) {
      const val = Number(a.balance);
      const cur = m.get(a.type) ?? { total: 0, color: a.color || '#9CA3AF' };
      m.set(a.type, { total: cur.total + val, color: cur.color });
    }
    return Array.from(m.entries()).map(([type, v]) => ({
      type, label: TYPE_LABEL[type] || type,
      total: v.total, color: v.color,
      pct: totalRub > 0 ? (v.total / totalRub) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [accounts, totalRub]);

  // Sync selected + transfer defaults when accounts load
  useEffect(() => {
    if (accounts.length === 0) return;
    if (!selectedId || !accounts.find(a => a.id === selectedId)) {
      setSelectedId(accounts[0].id);
    }
    if (!xferFrom || !accounts.find(a => a.id === xferFrom)) {
      setXferFrom(accounts[0].id);
    }
    if (!xferTo || !accounts.find(a => a.id === xferTo)) {
      setXferTo(accounts[Math.min(1, accounts.length - 1)].id);
    }
  }, [accounts, selectedId, xferFrom, xferTo]);

  const selected = accounts.find(a => a.id === selectedId);
  const selStats = selected ? accountStats[selected.id] : null;

  // ── CRUD handlers (preserved) ──────────────────────────────────────────
  const toPayload = (d: AccountFormData) => ({
    name: d.name, type: d.type, currency: d.currency, balance: d.balance,
    color: d.color ? d.color : undefined,
    icon: d.icon ? d.icon : undefined,
  });
  const handleCreate = async (d: AccountFormData) => {
    await createMutation.mutateAsync(toPayload(d));
    setShowForm(false);
  };
  const handleUpdate = async (d: AccountFormData) => {
    if (!editAccount) return;
    await updateMutation.mutateAsync({ id: editAccount.id, ...toPayload(d) });
    setEditAccount(null);
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  // ── Transfer ────────────────────────────────────────────────────────────
  async function handleTransfer() {
    setXferError(null);
    setXferOK(false);
    const fromAcc = accounts.find(a => a.id === xferFrom);
    if (!fromAcc) return;
    if (xferFrom === xferTo) { setXferError('Нельзя переводить на тот же счёт'); return; }
    if (!xferAmount || Number(xferAmount) <= 0) { setXferError('Укажите сумму больше нуля'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(xferAmount)) { setXferError('Сумма с точкой, до 2 знаков'); return; }
    try {
      await transferMutation.mutateAsync({
        fromAccountId: xferFrom,
        toAccountId: xferTo,
        amount: xferAmount,
        currency: fromAcc.currency,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setXferAmount('');
      setXferOK(true);
      setTimeout(() => setXferOK(false), 3000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        ?? 'Не удалось выполнить перевод';
      setXferError(msg);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-7 lg:p-9 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (isError) {
    return <div className="p-7"><QueryError message="Не удалось загрузить счета" onRetry={() => void refetch()} /></div>;
  }
  if (accounts.length === 0) {
    return (
      <div className="p-7 lg:p-9">
        <Card className="py-16">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl mb-3">🏦</span>
            <p className="font-medium text-lg">Счетов пока нет</p>
            <p className="text-sm mt-1 mb-4">Создайте первый счёт — без него нельзя добавлять операции</p>
            <Button variant="primary" onClick={() => setShowForm(true)}>Создать счёт</Button>
          </div>
        </Card>
        <Modal open={showForm} onClose={() => setShowForm(false)} title="Новый счёт">
          <AccountForm onSubmit={handleCreate} isLoading={createMutation.isPending} />
        </Modal>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">
            {accounts.length} активных {accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'}
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Счета</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHide(h => !h)}
            aria-label={hide ? 'Показать суммы' : 'Скрыть суммы'}
            className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            {hide ? <IconEye /> : <IconEyeOff />}
            <span>{hide ? 'Показать' : 'Скрыть'}</span>
          </button>
          <Button variant="primary" onClick={() => setShowForm(true)}>+ Новый счёт</Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Общий баланс"
          value={hide ? '••••••' : formatMoney(totalRub)}
          sub={`${accounts.length} ${accounts.length === 1 ? 'счёт' : accounts.length < 5 ? 'счёта' : 'счетов'} · ${byType.length} ${byType.length === 1 ? 'тип' : byType.length < 5 ? 'типа' : 'типов'}`}
          tintClass="bg-[#EEF0FF] dark:bg-[#1A2230]"
          accent={ACCENT} icon={<IconWallet />}
          spark={{ color: ACCENT, points: syntheticPoints('total', totalRub || 1) }} />
        <StatCard label="Доходы за месяц"
          value={hide ? '••••••' : `+${formatMoney(monthIn)}`}
          sub={`${transactions.filter(t => t.type === 'credit').length} операций`}
          tintClass="bg-[#E8F7EE] dark:bg-[#142421]"
          accent={INCOME} icon={<IconArrDown />} />
        <StatCard label="Накопления"
          value={hide ? '••••••' : formatMoney(totalSavings)}
          sub={`цель ${formatMoney(SAVINGS_GOAL)}`}
          tintClass="bg-[#EEEBFB] dark:bg-[#1B1B30]"
          accent={ACCENT} valueClass="text-brand-600 dark:text-brand-500"
          icon={<IconPig />} progress={totalSavings / SAVINGS_GOAL} />
        <StatCard label="Чистый поток"
          value={hide ? '••••••' : `${monthNet >= 0 ? '+' : '−'}${formatMoney(Math.abs(monthNet))}`}
          sub={`+${formatMoney(monthIn)} / −${formatMoney(monthOut)}`}
          tintClass={cn(monthNet >= 0 ? 'bg-[#E8F7EE] dark:bg-[#142421]' : 'bg-[#FDECEC] dark:bg-[#2A1A1F]')}
          accent={monthNet >= 0 ? INCOME : EXPENSE}
          valueClass={monthNet >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}
          icon={monthNet >= 0 ? <IconArrDown /> : <IconArrUp />}
          spark={{ color: monthNet >= 0 ? INCOME : EXPENSE, points: syntheticPoints('net', Math.abs(monthNet) || 1) }} />
      </div>

      {/* Master-detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
        <Card className="p-0">
          <div className="flex items-center gap-3 px-6 pt-5 pb-3">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-gray-100">Мои счета</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1F2331] px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-[#262A3A]">
              {accounts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-5 pb-5">
            {accounts.map(acc => (
              <BigAccountCard
                key={acc.id} acc={acc}
                stats={accountStats[acc.id] ?? { inSum: 0, outSum: 0, txCount: 0, txs: [], points: [] }}
                selected={acc.id === selectedId}
                onClick={() => setSelectedId(acc.id)}
                hide={hide}
              />
            ))}
            <AddAccountTile onClick={() => setShowForm(true)} />
          </div>
        </Card>

        {/* Detail panel */}
        {selected && selStats && (
          <Card className="p-0 lg:sticky lg:top-5 overflow-hidden">
            <div
              className="px-5 pt-5 pb-5 border-b border-gray-200 dark:border-[#262A3A]"
              style={{ background: `linear-gradient(160deg, ${hexA(selected.color || ACCENT, 0.14)}, ${hexA(selected.color || ACCENT, 0.02)})` }}
            >
              <div className="flex items-center gap-3 mb-3.5">
                <span
                  className="w-10 h-10 rounded-xl grid place-items-center text-lg flex-shrink-0"
                  style={{ background: hexA(selected.color || ACCENT, 0.20), color: selected.color || ACCENT }}
                >
                  {selected.icon || TYPE_ICON[selected.type] || '🏦'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold tracking-tight truncate text-gray-900 dark:text-gray-100">{selected.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {TYPE_LABEL[selected.type] || selected.type} · {selected.currency}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Редактировать счёт"
                  title="Редактировать"
                  onClick={() => setEditAccount(selected)}
                  className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:text-brand-600 hover:bg-white/40 dark:hover:bg-white/[0.06]"
                >
                  <IconEdit />
                </button>
                <button
                  type="button"
                  aria-label="Удалить счёт"
                  title="Удалить"
                  onClick={() => setDeleteId(selected.id)}
                  className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:text-red-500 hover:bg-white/40 dark:hover:bg-white/[0.06]"
                >
                  <IconTrash />
                </button>
              </div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-gray-500 dark:text-gray-400 mb-1">Текущий баланс</div>
              <div
                className="text-[30px] font-semibold tracking-[-0.02em] tabular-nums"
                style={{ color: Number(selected.balance) < 0 ? EXPENSE : undefined }}
              >
                {hide ? '••••••' : formatMoney(selected.balance, selected.currency)}
              </div>
              <div className="mt-3">
                <Sparkline color={selected.color || ACCENT} points={selStats.points} w={320} h={56} />
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-gray-200 dark:border-[#262A3A]">
              <div className="px-5 py-3.5">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Поступило</div>
                <div className="text-base font-semibold tabular-nums" style={{ color: INCOME }}>
                  {hide ? '••••' : `+${formatMoney(selStats.inSum, selected.currency)}`}
                </div>
              </div>
              <div className="px-5 py-3.5 border-l border-gray-200 dark:border-[#262A3A]">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Списано</div>
                <div className="text-base font-semibold tabular-nums" style={{ color: EXPENSE }}>
                  {hide ? '••••' : `−${formatMoney(selStats.outSum, selected.currency)}`}
                </div>
              </div>
            </div>

            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center mb-2">
                <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Последние операции</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{selStats.txCount} всего</span>
              </div>
              {selStats.txs.length === 0 ? (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">Без операций за период</div>
              ) : (
                <ul className="flex flex-col gap-0.5 -mx-2 mb-1">
                  {selStats.txs.slice(0, 5).map(tx => {
                    const isIn = tx.type === 'credit';
                    const isTransfer = tx.type === 'transfer';
                    const color = tx.categoryColor || (isTransfer ? ACCENT : '#9CA3AF');
                    return (
                      <li key={tx.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
                        <span
                          className="w-7 h-7 rounded-[9px] grid place-items-center text-xs font-semibold flex-shrink-0"
                          style={{ background: hexA(color, 0.14), color }}
                        >
                          {isTransfer ? '↔' : initialOf(tx.categoryName || tx.merchant)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate text-gray-900 dark:text-gray-100">
                            {tx.merchant || tx.description || 'Операция'}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">{shortDate(tx.date)}</div>
                        </div>
                        <div
                          className="text-[13px] font-semibold tabular-nums whitespace-nowrap"
                          style={{ color: isIn ? INCOME : isTransfer ? ACCENT : undefined }}
                        >
                          {hide ? '•••' : `${isIn ? '+' : isTransfer ? '' : '−'}${compactMoney(Number(tx.amount), tx.currency)}`}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Allocation + quick transfer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-gray-100">
              Распределение по типам
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">в ₽-эквиваленте</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6 items-center">
            <AllocationDonut items={byType} totalRub={totalRub} hide={hide} />
            <ul className="flex flex-col gap-2.5">
              {byType.map(b => (
                <li key={b.type} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: b.color }} />
                  <span className="text-sm flex-1 min-w-0 truncate text-gray-900 dark:text-gray-100">{b.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-11 text-right">
                    {b.pct.toFixed(1)}%
                  </span>
                  <span className="text-sm font-medium tabular-nums w-28 text-right whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {hide ? '••••' : compactMoney(Math.round(b.total))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-gray-100">
              Быстрый перевод
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">между своими счетами</span>
          </div>
          <div className="grid grid-cols-[1fr_36px_1fr] gap-2.5 items-end mb-3.5">
            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.04em] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Откуда</div>
              <AccountSelect accounts={accounts} value={xferFrom} onChange={setXferFrom} hide={hide} />
            </label>
            <div className="grid place-items-center pb-2 text-gray-500">
              <button
                type="button"
                aria-label="Поменять счета местами"
                onClick={() => { const a = xferFrom; setXferFrom(xferTo); setXferTo(a); }}
                className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] grid place-items-center hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              >
                <IconTransfer />
              </button>
            </div>
            <label className="block">
              <div className="text-[11px] uppercase tracking-[0.04em] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Куда</div>
              <AccountSelect accounts={accounts} value={xferTo} onChange={setXferTo} hide={hide} />
            </label>
          </div>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.04em] font-medium text-gray-500 dark:text-gray-400 mb-1.5">Сумма</div>
            <div className="flex items-center px-3.5 h-11 bg-gray-50 dark:bg-[#1F2331] border border-gray-200 dark:border-[#262A3A] rounded-xl">
              <input
                value={xferAmount}
                onChange={e => setXferAmount(e.target.value)}
                placeholder="0"
                type="text"
                inputMode="decimal"
                aria-label="Сумма перевода"
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-gray-900 dark:text-gray-100 text-[22px] font-semibold tabular-nums"
              />
              <span className="text-gray-500 dark:text-gray-400 text-base font-medium">
                {accounts.find(a => a.id === xferFrom)?.currency || 'RUB'}
              </span>
            </div>
          </label>

          <div className="flex gap-2 mt-2 flex-wrap">
            {[1000, 5000, 10000, 25000].map(v => (
              <button
                key={v} type="button" onClick={() => setXferAmount(String(v))}
                className="px-3 py-1 rounded-full border border-gray-200 dark:border-[#262A3A] text-gray-500 dark:text-gray-400 text-xs hover:bg-gray-50 dark:hover:bg-white/[0.04]"
              >
                + {compactMoney(v)}
              </button>
            ))}
          </div>

          {xferError && <p role="alert" className="mt-3 text-xs text-red-500">{xferError}</p>}
          {xferOK && <p role="status" className="mt-3 text-xs" style={{ color: INCOME }}>Перевод выполнен ✓</p>}

          <button
            type="button"
            onClick={handleTransfer}
            disabled={transferMutation.isPending}
            className="mt-4 w-full py-3 px-4 rounded-xl bg-brand-600 text-white text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-60"
            style={{ boxShadow: `0 6px 16px -8px ${ACCENT}` }}
          >
            <IconTransfer /> {transferMutation.isPending ? 'Перевод…' : 'Перевести'}
          </button>
        </Card>
      </div>

      {/* ── CRUD modals (preserved) ─────────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Новый счёт">
        <AccountForm onSubmit={handleCreate} isLoading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Редактировать счёт">
        {editAccount && (
          <AccountForm initial={editAccount} onSubmit={handleUpdate} isLoading={updateMutation.isPending} />
        )}
      </Modal>
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Удалить счёт">
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Удалить этот счёт? Операции по нему останутся, но счёт будет скрыт.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
