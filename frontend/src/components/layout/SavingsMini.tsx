// SavingsMini — Бабкосчёт sidebar widget ("Копилка").
// Visual language matches Babkoschet/shell-v3.jsx → SavingsMini.
// Sums all `savings`-type account balances vs a fixed 80 000 ₽ goal.

import { useAccounts } from '@/hooks/useAccounts';
import { formatMoney, sumMoney } from '@/lib/utils';

const SAVINGS_GOAL = 80000;
const ACCENT = '#6366F1'; // brand-600

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function SavingsMini({ collapsed }: { collapsed?: boolean }) {
  const { data: accounts } = useAccounts();

  // Treat both 'savings' and Russian-codebase 'savings' equivalent;
  // fall back gracefully when accounts are still loading.
  const savingsBalance = accounts
    ? Number(
        sumMoney(
          accounts
            .filter((a) => a.type === 'savings' && a.currency === 'RUB')
            .map((a) => a.balance),
        ),
      )
    : 0;

  const pct = Math.max(0, Math.min(100, (savingsBalance / SAVINGS_GOAL) * 100));

  // Collapsed sidebar: just show a thin progress bar with a $ glyph.
  if (collapsed) {
    return (
      <div
        title={`Копилка: ${formatMoney(savingsBalance)} / ${formatMoney(SAVINGS_GOAL)}`}
        className="mx-2 mb-2 rounded-xl p-2 grid place-items-center"
        style={{
          background: `linear-gradient(160deg, ${hexA(ACCENT, 0.22)}, ${hexA(ACCENT, 0.06)})`,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-[11px] font-semibold text-white">
          {Math.round(pct)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className="mx-2 mb-2 rounded-xl p-3.5"
      style={{
        background: `linear-gradient(160deg, ${hexA(ACCENT, 0.18)}, ${hexA(ACCENT, 0.04)})`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="text-[11px] text-sidebarMute uppercase tracking-[0.04em] mb-1.5">
        Копилка
      </div>
      <div className="text-[18px] font-semibold text-white tracking-tightish tabular-nums">
        {formatMoney(savingsBalance)}
      </div>
      <div className="h-[5px] rounded-full bg-white/10 mt-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: ACCENT }}
        />
      </div>
      <div className="text-[11px] text-sidebarMute mt-2">
        {Math.round(pct)}% от цели {formatMoney(SAVINGS_GOAL)}
      </div>
    </div>
  );
}
