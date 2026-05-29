// Active-sessions panel for the Settings page. Lists devices (one per
// refresh-token family), lets the user end any of them, and offers a
// "выйти на всех других устройствах" button.

import { useSessions, useRevokeSession, useRevokeOtherSessions, Session } from '@/hooks/useSessions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

// Cheap UA → human label. Avoids a parser dep; good enough for a hint.
function describeDevice(ua: string | null): { icon: string; label: string } {
  if (!ua) return { icon: '🖥️', label: 'Неизвестное устройство' };
  const u = ua.toLowerCase();
  const mobile = /iphone|android|mobile|ipad/.test(u);
  let browser = 'Браузер';
  if (u.includes('firefox')) browser = 'Firefox';
  else if (u.includes('edg/')) browser = 'Edge';
  else if (u.includes('chrome')) browser = 'Chrome';
  else if (u.includes('safari')) browser = 'Safari';
  let os = '';
  if (u.includes('windows')) os = 'Windows';
  else if (u.includes('mac os') || u.includes('macintosh')) os = 'macOS';
  else if (u.includes('android')) os = 'Android';
  else if (u.includes('iphone') || u.includes('ipad') || u.includes('ios')) os = 'iOS';
  else if (u.includes('linux')) os = 'Linux';
  return { icon: mobile ? '📱' : '🖥️', label: [browser, os].filter(Boolean).join(' · ') || 'Устройство' };
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  return `${days} дн назад`;
}

function SessionRow({ s, onRevoke, busy }: { s: Session; onRevoke: (id: string) => void; busy: boolean }) {
  const dev = describeDevice(s.userAgent);
  return (
    <div className="flex items-center gap-3 py-3 border-t border-gray-100 dark:border-[#262A3A] first:border-t-0 first:pt-0">
      <span className="text-xl flex-shrink-0" aria-hidden="true">{dev.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {dev.label}
          {s.isCurrent && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400">
              это устройство
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {s.ip ?? 'IP неизвестен'}
          {s.lastUsedAt && ` · активно ${relativeTime(s.lastUsedAt)}`}
        </div>
      </div>
      {!s.isCurrent && (
        <button
          type="button"
          onClick={() => onRevoke(s.familyId)}
          disabled={busy}
          aria-label="Завершить сессию"
          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50 flex-shrink-0"
        >
          Выйти
        </button>
      )}
    </div>
  );
}

export function SessionsCard() {
  const { data, isLoading, isError } = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const toast = useToast();

  const sessions = data ?? [];
  const others = sessions.filter((s) => !s.isCurrent).length;

  async function handleRevoke(id: string) {
    try {
      await revoke.mutateAsync(id);
      toast.showSuccess('Сессия завершена');
    } catch {
      toast.showError('Не удалось завершить сессию');
    }
  }

  async function handleRevokeOthers() {
    try {
      const { revoked } = await revokeOthers.mutateAsync();
      toast.showSuccess(`Завершено сессий: ${revoked}`);
    } catch {
      toast.showError('Не удалось завершить сессии');
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">Устройства и сессии</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Где выполнен вход. Завершите сессии, которые не узнаёте.
          </p>
        </div>
        {others > 0 && (
          <Button variant="secondary" onClick={handleRevokeOthers} disabled={revokeOthers.isPending}>
            {revokeOthers.isPending ? 'Завершаю…' : 'Выйти на других'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : isError ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Не удалось загрузить список сессий.</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Активных сессий нет.</p>
      ) : (
        <div>
          {sessions.map((s) => (
            <SessionRow key={s.familyId} s={s} onRevoke={handleRevoke} busy={revoke.isPending} />
          ))}
        </div>
      )}
    </Card>
  );
}
