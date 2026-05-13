import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

/* ─── иконки (inline SVG, без сторонних зависимостей) ─── */
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 13.5l5.25-5.25 3 3L16.5 6 21 10.5M3 20h18" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 3l7.5 3v5.25c0 4.35-3.15 8.4-7.5 9.75C7.65 19.65 4.5 15.6 4.5 11.25V6L12 3z" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}
function IconRepeat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 ml-1">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

/* ─── данные ─── */
const FEATURES = [
  {
    icon: <IconChart />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    title: 'Аналитика и отчёты',
    desc: 'Наглядные графики доходов, расходов и денежного потока. Разбивка по категориям одним взглядом.',
  },
  {
    icon: <IconShield />,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    title: 'Безопасность',
    desc: 'Данные хранятся только у вас. JWT-аутентификация, шифрование, изоляция на уровне базы данных.',
  },
  {
    icon: <IconBell />,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
    title: 'Бюджеты и лимиты',
    desc: 'Задайте месячные лимиты по категориям и отслеживайте, сколько осталось, в режиме реального времени.',
  },
  {
    icon: <IconRepeat />,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    title: 'Регулярные платежи',
    desc: 'Подписки, аренда, кредиты — автоматический учёт повторяющихся транзакций без ручного ввода.',
  },
  {
    icon: <IconGlobe />,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
    title: 'Мультивалютность',
    desc: 'Счета в разных валютах, автоматический пересчёт по курсу в базовую валюту.',
  },
  {
    icon: <IconChart />,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
    title: 'Импорт транзакций',
    desc: 'Загрузите CSV-выписку из банка и все транзакции появятся мгновенно.',
  },
];

const STEPS = [
  { n: '01', title: 'Создайте аккаунт', desc: 'Регистрация за 30 секунд — только email и пароль.' },
  { n: '02', title: 'Добавьте счета', desc: 'Карты, наличные, вклады — любое количество в любой валюте.' },
  { n: '03', title: 'Вносите транзакции', desc: 'Вручную или через импорт CSV-файла из банка.' },
  { n: '04', title: 'Анализируйте', desc: 'Смотрите отчёты и управляйте бюджетами осознанно.' },
];

/* ─── компонент ─── */
export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  /* авторизованного — сразу на дашборд */
  useEffect(() => {
    if (!isLoading && user) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* ── Навбар ── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Логотип */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm select-none">Ф</div>
            <span className="font-semibold text-lg tracking-tight">ФинансыПро</span>
          </div>

          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Возможности</a>
            <a href="#how" className="hover:text-gray-900 dark:hover:text-white transition-colors">Как работает</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-1.5"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* фоновый градиент */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Бесплатно · Без рекламы · Ваши данные только у вас
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Управляйте финансами{' '}
            <span className="text-blue-600 dark:text-blue-400">осознанно</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Персональный финансовый трекер: счета, транзакции, бюджеты и аналитика в одном месте.
            Никаких банковских интеграций — вы контролируете каждую цифру.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-500/25 w-full sm:w-auto"
            >
              Создать аккаунт бесплатно
              <IconArrow />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center text-base font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-7 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors w-full sm:w-auto"
            >
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </div>

        {/* Мокап дашборда */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-16">
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden shadow-2xl shadow-gray-900/10 dark:shadow-black/30">
            {/* Имитация браузерного хрома */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-2 flex-1 max-w-xs h-5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-400 flex items-center px-2">
                financepro.app/dashboard
              </div>
            </div>
            {/* Контент мокапа */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Баланс', value: '₽ 284 500', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Доходы (май)', value: '₽ 120 000', color: 'text-green-600 dark:text-green-400' },
                { label: 'Расходы (май)', value: '₽ 73 200', color: 'text-red-600 dark:text-red-400' },
                { label: 'Экономия', value: '₽ 46 800', color: 'text-violet-600 dark:text-violet-400' },
              ].map(c => (
                <div key={c.label} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{c.label}</p>
                  <p className={`font-bold text-base sm:text-lg ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 grid sm:grid-cols-2 gap-3">
              {/* Таблица транзакций */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Последние транзакции</p>
                <div className="space-y-2.5">
                  {[
                    { name: 'Лента', cat: 'Продукты', amt: '-₽ 3 480', c: 'text-red-500' },
                    { name: 'Зарплата', cat: 'Доход', amt: '+₽ 120 000', c: 'text-green-500' },
                    { name: 'Netflix', cat: 'Подписки', amt: '-₽ 799', c: 'text-red-500' },
                    { name: 'Кафе', cat: 'Кафе и рестораны', amt: '-₽ 1 250', c: 'text-red-500' },
                  ].map(t => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.cat}</p>
                      </div>
                      <span className={`font-semibold text-xs ${t.c}`}>{t.amt}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Бюджеты */}
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Бюджеты на май</p>
                <div className="space-y-3">
                  {[
                    { name: 'Продукты', pct: 68, used: '₽ 13 600', of: '₽ 20 000', color: 'bg-green-500' },
                    { name: 'Транспорт', pct: 45, used: '₽ 2 250', of: '₽ 5 000', color: 'bg-green-500' },
                    { name: 'Развлечения', pct: 87, used: '₽ 8 700', of: '₽ 10 000', color: 'bg-orange-500' },
                  ].map(b => (
                    <div key={b.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{b.name}</span>
                        <span className="text-gray-400">{b.used} / {b.of}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className={`h-1.5 rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Возможности ── */}
      <section id="features" className="py-20 sm:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Всё для контроля над деньгами</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Инструменты, которые помогают понять, куда уходят деньги, и принять правильные решения.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-black/20 transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Как работает ── */}
      <section id="how" className="py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Начать просто</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Четыре шага до полного контроля над личными финансами.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-5">
                <div className="flex-none w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-24 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Начните отслеживать финансы уже сегодня
          </h2>
          <p className="text-blue-100 text-lg mb-10">
            Бесплатно, без банковских ключей, без скрытых платежей.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-lg"
          >
            Создать аккаунт бесплатно
            <IconArrow />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">Ф</div>
            <span>ФинансыПро</span>
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Войти</Link>
            <Link to="/register" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Регистрация</Link>
          </div>
          <p>© {new Date().getFullYear()} ФинансыПро. Все права защищены.</p>
        </div>
      </footer>

    </div>
  );
}
