// SavingsMini — Бабкосчёт sidebar widget ("Копилка").
// Shows progress on the first active savings goal. Falls back to a "create
// goal" CTA when there are none.
//
// Why a sidebar widget needs a separate fetch: it's mounted in AppLayout
// (under ProtectedRoute) and is the only consumer of /goals at this level.
// Cost is one cached useQuery shared with the /goals page — no extra request.

import { Link } from 'react-router-dom';
import { useGoals } from '@/hooks/useGoals';
import { formatMoney } from '@/lib/utils';

const ACCENT = '#6366F1'; // brand-600

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function SavingsMini({ collapsed }: { collapsed?: boolean }) {
  const { data: goals } = useGoals();
  const active = (goals ?? []).find((g) => g.isActive);

  // Collapsed sidebar — small icon-only pill linking to /goals.
  if (collapsed) {
    return (
      <Link
        to="/goals"
        title={active
          ? `Копилка: ${formatMoney(active.currentAmount)} / ${formatMoney(active.targetAmount)}`
          : 'Поставить цель'}
        className="mx-2 mb-2 rounded-xl p-2 grid place-items-center"
        style={{
          background: `linear-gradient(160deg, ${hexA(ACCENT, 0.22)}, ${hexA(ACCENT, 0.06)})`,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-[11px] font-semibold text-white">
          {active ? `${Math.round(active.progressPct)}%` : '+'}
        </span>
      </Link>
    );
  }

  // Empty state — encourage creating a goal.
  if (!active) {
    return (
      <Link
        to="/goals"
        className="mx-2 mb-2 rounded-xl p-3.5 block hover:opacity-90 transition-opacity"
        style={{
          background: `linear-gradient(160deg, ${hexA(ACCENT, 0.18)}, ${hexA(ACCENT, 0.04)})`,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="text-[11px] text-sidebarMute uppercase tracking-[0.04em] mb-1.5">Копилка</div>
        <div className="text-[13px] font-medium text-white">Поставьте первую цель →</div>
        <div className="text-[11px] text-sidebarMute mt-1">Например, на отпуск</div>
      </Link>
    );
  }

  const color = active.color ?? ACCENT;
  return (
    <Link
      to="/goals"
      title={`Открыть «${active.name}»`}
      className="mx-2 mb-2 rounded-xl p-3.5 block hover:opacity-95 transition-opacity"
      style={{
        background: `linear-gradient(160deg, ${hexA(color, 0.18)}, ${hexA(color, 0.04)})`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="text-[11px] text-sidebarMute uppercase tracking-[0.04em] mb-1.5 flex items-center gap-1.5">
        <span aria-hidden="true">{active.icon ?? '🐷'}</span>
        <span className="truncate">{active.name}</span>
      </div>
      <div className="text-[18px] font-semibold text-white tracking-tightish tabular-nums">
        {formatMoney(active.currentAmount)}
      </div>
      <div className="h-[5px] rounded-full bg-white/10 mt-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, active.progressPct)}%`, background: color }}
        />
      </div>
      <div className="text-[11px] text-sidebarMute mt-2 tabular-nums">
        {Math.round(active.progressPct)}% от {formatMoney(active.targetAmount)}
        {active.daysLeft !== null && active.daysLeft > 0 && (
          <span> · {active.daysLeft} дн.</span>
        )}
      </div>
    </Link>
  );
}
