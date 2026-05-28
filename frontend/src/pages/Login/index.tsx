import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { extractApiError } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(values: LoginForm) {
    setServerError('');
    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setServerError(extractApiError(err));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold hover:bg-brand-700 transition-colors">
              Ф
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Бабкосчёт</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Войдите в свой аккаунт</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-5">
          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow',
                  errors.email ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                )}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Пароль</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Забыли пароль?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow',
                  errors.password ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                )}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
              {isSubmitting ? 'Входим…' : 'Войти'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Нет аккаунта?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
