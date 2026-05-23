// ════════════════════════════════════════════════════════════════════════════
// Настройки — профиль / пароль / внешний вид / данные
// All backend endpoints already exist; export-data builds a JSON dump on the
// client from existing list endpoints (accounts/transactions/budgets/cats).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/store/uiStore';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(8, 'Минимум 8 символов').max(100, 'Максимум 100 символов'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, {
  message: 'Пароли не совпадают',
  path: ['confirm'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {sub && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-t border-gray-100 dark:border-[#262A3A] first:border-t-0 first:pt-0">
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useUIStore();
  const toast = useToast();

  // ── Password change ────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const [pwBusy, setPwBusy] = useState(false);
  const onChangePassword = async (d: PasswordForm) => {
    setPwBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: d.currentPassword,
        newPassword: d.newPassword,
      });
      toast.showSuccess('Пароль изменён');
      reset();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        ?? 'Не удалось изменить пароль';
      toast.showError(msg);
    } finally {
      setPwBusy(false);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────
  const [exportBusy, setExportBusy] = useState(false);
  async function handleExport() {
    setExportBusy(true);
    try {
      const [accounts, categories, budgets] = await Promise.all([
        api.get('/accounts').then(r => r.data.data),
        api.get('/categories').then(r => r.data.data),
        api.get('/budgets').then(r => r.data.data),
      ]);
      // Pull all transactions by following cursor pagination.
      const txs: unknown[] = [];
      let cursor: string | null = null;
      // Bounded loop — protects against runaway pagination from a broken API.
      for (let i = 0; i < 1000; i++) {
        const params = new URLSearchParams({ limit: '100' });
        if (cursor) params.set('cursor', cursor);
        const page = (await api.get(`/transactions?${params}`)).data;
        txs.push(...page.data);
        if (!page.pagination?.hasMore) break;
        cursor = page.pagination.nextCursor;
      }
      const dump = {
        exportedAt: new Date().toISOString(),
        user: { email: user?.email, fullName: user?.fullName },
        accounts, categories, budgets, transactions: txs,
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `babkoschet-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.showSuccess(`Выгружено: ${txs.length} операций`);
    } catch {
      toast.showError('Не удалось выгрузить данные');
    } finally {
      setExportBusy(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-5 pb-16 max-w-3xl">
      <div>
        <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Аккаунт и предпочтения</div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">Настройки</h1>
      </div>

      <Section title="Профиль">
        <Row label="Имя">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.fullName ?? '—'}</span>
        </Row>
        <Row label="Email">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.email ?? '—'}</span>
        </Row>
        <Row label="Валюта по умолчанию">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₽ RUB</span>
        </Row>
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
          Редактирование профиля появится в одном из ближайших обновлений.
        </p>
      </Section>

      <Section title="Сменить пароль" sub="Минимум 8 символов. После смены сессия останется активной на этом устройстве.">
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-3">
          <div>
            <label htmlFor="cur-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Текущий пароль</label>
            <input id="cur-pw" {...register('currentPassword')} type="password" autoComplete="current-password" className={inputCls} />
            {errors.currentPassword && <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Новый пароль</label>
              <input id="new-pw" {...register('newPassword')} type="password" autoComplete="new-password" className={inputCls} />
              {errors.newPassword && <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>}
            </div>
            <div>
              <label htmlFor="confirm-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Повторите</label>
              <input id="confirm-pw" {...register('confirm')} type="password" autoComplete="new-password" className={inputCls} />
              {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={pwBusy}>
            {pwBusy ? 'Сохранение…' : 'Изменить пароль'}
          </Button>
        </form>
      </Section>

      <Section title="Внешний вид">
        <Row label="Тема интерфейса">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26] text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
            aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          >
            {theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
          </button>
        </Row>
      </Section>

      <Section title="Данные" sub="Полная выгрузка вашего аккаунта в JSON — счета, категории, бюджеты и все операции.">
        <Row label="Экспортировать всё">
          <Button variant="secondary" onClick={handleExport} disabled={exportBusy}>
            {exportBusy ? 'Выгружаю…' : '⇩ Скачать JSON'}
          </Button>
        </Row>
        <Row label="Удалить аккаунт">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400"
            title="Появится в следующих версиях"
          >
            скоро
          </span>
        </Row>
      </Section>
    </div>
  );
}
