// /forgot-password — submit email, backend will email a reset link.
// Always shows the same "проверьте почту" message regardless of whether
// the email is registered (no user enumeration).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Неверный формат email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSent(true);
    } catch (e: unknown) {
      // Backend always 200s the success path; this catches rate-limit (429)
      // or unexpected 5xx. We still pretend success so the UI doesn't leak.
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 429) setError('Слишком много попыток. Подождите 15 минут.');
      else setSent(true);
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
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Сброс пароля</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Введите email — пришлём ссылку для сброса.
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 text-sm text-green-800 dark:text-green-300">
              <p className="font-medium">Проверьте почту 📬</p>
              <p className="mt-1">
                Если email зарегистрирован, мы прислали ссылку на сброс пароля.
                Ссылка действует 30 минут.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500',
                    errors.email ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  )}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Отправляем…' : 'Отправить ссылку'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Вспомнили?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
