// /reset-password?token=... — finish the flow. Posts {token, password} to
// backend; on success redirects to /login with a "пароль обновлён" toast.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const schema = z.object({
  password: z.string().min(8, 'Минимум 8 символов').max(100),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  path: ['confirm'], message: 'Пароли не совпадают',
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      toast.showSuccess('Пароль обновлён — войдите с новым');
      navigate('/login', { replace: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Ссылка недействительна или истекла';
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-xl tracking-tight text-gray-900 dark:text-white">
            <span className="w-9 h-9 rounded-xl bg-brand-600 grid place-items-center text-white font-bold">₽</span>
            Бабкосчёт
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-soft p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Новый пароль</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Минимум 8 символов. После сохранения сессии на других устройствах закроются.
            </p>
          </div>

          {!token ? (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-sm text-red-800 dark:text-red-300">
              Ссылка повреждена — токен отсутствует. Запросите новую ссылку.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Новый пароль</label>
                <input
                  id="new-pw" type="password" autoComplete="new-password" autoFocus
                  {...register('password')}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500',
                    errors.password ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Повторите</label>
                <input
                  id="confirm" type="password" autoComplete="new-password"
                  {...register('confirm')}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500',
                    errors.confirm ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="••••••••"
                />
                {errors.confirm && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirm.message}</p>}
              </div>
              {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Сохраняем…' : 'Установить пароль'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Назад ко входу
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
