// ════════════════════════════════════════════════════════════════════════════
// Landing — Бабкосчёт
// Mirrors Babkoschet/Landing.html (Nav · Hero · Preview · Features bento ·
// Personas · CTA · Footer). Tailwind-only, no inline <style>.
// Auth-aware: logged-in users get redirected to /dashboard.
// ════════════════════════════════════════════════════════════════════════════

import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hexA, ACCENT, INCOME, EXPENSE, WARN, PINK, SKY, VIOLET } from '@/lib/colors';

// ── Reusable bits ───────────────────────────────────────────────────────────
function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-block text-[12px] font-medium uppercase tracking-[0.12em] ${dark ? 'text-[#9298AC]' : 'text-gray-500'}`}>
      {children}
    </span>
  );
}

function SectionTitle({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2 className={`mt-3 mb-3 font-display font-bold tracking-[-0.02em] text-[40px] leading-[1.1] md:text-[48px] ${dark ? 'text-white' : 'text-[#171821]'}`}>
      {children}
    </h2>
  );
}

function SectionLead({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`max-w-[640px] text-[17px] leading-relaxed ${dark ? 'text-[#B5B9CC]' : 'text-[#6B7080]'}`}>
      {children}
    </p>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-cream text-[#171821] min-h-screen font-sans antialiased">
      {/* ─── NAV ─── */}
      <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'bg-cream/90 backdrop-blur-md border-b border-[#E7E4DA]' : 'bg-transparent'}`}>
        <div className="max-w-[1240px] mx-auto px-6 h-[72px] flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-[17px] tracking-tight">
            <span
              className="w-9 h-9 rounded-xl grid place-items-center text-white font-bold"
              style={{ background: ACCENT, boxShadow: `0 6px 16px -6px ${ACCENT}` }}
            >₽</span>
            <span>Бабкосчёт</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 ml-4 text-[14px] text-[#6B7080]">
            <a href="#features" className="hover:text-[#171821] transition-colors">Возможности</a>
            <a href="#personas" className="hover:text-[#171821] transition-colors">Для кого</a>
            <a href="#preview" className="hover:text-[#171821] transition-colors">Интерфейс</a>
          </nav>
          <div className="flex-1" />
          <Link to="/login" className="hidden sm:inline-flex items-center h-9 px-3 text-sm text-[#171821] hover:text-brand-700">
            Войти
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center h-10 px-4 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            style={{ boxShadow: `0 6px 16px -8px ${ACCENT}` }}
          >
            Начать бесплатно
          </Link>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden pt-16 md:pt-24 pb-20">
        {/* Soft accent blob behind hero */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${hexA(ACCENT, 0.22)}, transparent 70%)` }}
        />
        <div className="max-w-[1240px] mx-auto px-6 relative">
          <div className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-white/70 border border-[#E7E4DA] text-[12px] font-medium text-[#2A2D3C]">
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white grid place-items-center text-[10px] font-bold">₽</span>
            Личные финансы без боли · бета 2026
          </div>
          <h1 className="mt-6 font-display font-extrabold tracking-[-0.025em] text-[64px] leading-[1.02] md:text-[88px]">
            Куда улетели<br />
            все <span className="relative inline-block">
              <span className="text-brand-600">бабки</span>
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 -bottom-1.5 h-[6px] rounded-full"
                style={{ background: hexA(ACCENT, 0.22) }}
              />
            </span>?
          </h1>
          <p className="mt-7 max-w-[640px] text-[18px] leading-relaxed text-[#2A2D3C]">
            Бабкосчёт показывает, на что вы <b className="text-[#171821] font-semibold">реально</b> потратили зарплату,
            помогает откладывать на мечту и не уходить в минус к 25-му числу.
            Без банков-партнёров, без подписок — <b className="text-[#171821] font-semibold">полностью бесплатно</b>.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-brand-600 text-white text-[16px] font-semibold hover:bg-brand-700"
              style={{ boxShadow: `0 10px 24px -10px ${ACCENT}` }}
            >
              Начать бесплатно
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#preview"
              className="inline-flex items-center h-14 px-7 rounded-2xl bg-white border border-[#E7E4DA] text-[16px] font-medium hover:border-[#171821]"
            >
              Посмотреть демо
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#6B7080]">
            <span className="inline-flex items-center gap-1.5"><span className="text-brand-600 font-bold">✓</span> Без рекламы</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-brand-600 font-bold">✓</span> Без подписки</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-brand-600 font-bold">✓</span> Данные у вас</span>
          </div>

          {/* Stats strip */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: '2', unit: 'мин', label: 'Завести первый бюджет' },
              { num: '5', unit: '',    label: 'Счетов в одном месте' },
              { num: '12', unit: '%',  label: 'Средняя экономия за месяц' },
              { num: '0', unit: ' ₽',  label: 'Стоимость. Навсегда' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white border border-[#E7E4DA] p-5">
                <div className="font-display text-[36px] font-bold tracking-tight tabular-nums">
                  {s.num}<span className="text-[18px] font-semibold text-[#6B7080]">{s.unit}</span>
                </div>
                <div className="text-[13px] text-[#6B7080] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PREVIEW ─── */}
      <section id="preview" className="py-20">
        <div className="max-w-[1240px] mx-auto px-6">
          <Eyebrow>Интерфейс</Eyebrow>
          <SectionTitle>Один экран — и всё стало понятно.</SectionTitle>
          <SectionLead>
            Дашборд, который не пугает графиками. Видно, сколько у вас денег прямо сейчас,
            куда они уходят и сколько осталось до конца месяца.
          </SectionLead>

          {/* Mock device — desktop */}
          <div className="mt-12 rounded-3xl bg-[#1E2235] p-2 shadow-2xl shadow-brand-900/20 max-w-[920px] mx-auto">
            <div className="rounded-2xl bg-cream overflow-hidden border border-[#E7E4DA]">
              <div className="flex">
                {/* mini sidebar */}
                <aside className="hidden sm:flex w-[156px] bg-[#1E2235] text-white flex-col p-3 gap-2">
                  <div className="flex items-center gap-2 px-1 pb-2 border-b border-white/[0.06]">
                    <span className="w-6 h-6 rounded-md bg-brand-600 grid place-items-center text-[10px] font-bold">₽</span>
                    <div className="text-[11px] font-semibold">Бабкосчёт</div>
                  </div>
                  {['Главная','Счета','Операции','Бюджеты','Отчёты'].map((n, i) => (
                    <div
                      key={n}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] ${i === 0 ? 'bg-white/[0.06] text-white font-medium' : 'text-[#B5B9CC]'}`}
                    >
                      {n}
                    </div>
                  ))}
                  <div className="mt-auto rounded-lg p-2.5"
                       style={{ background: `linear-gradient(160deg, ${hexA(ACCENT, 0.18)}, ${hexA(ACCENT, 0.04)})` }}>
                    <div className="text-[9px] uppercase tracking-wider text-[#9298AC]">Копилка</div>
                    <div className="text-[13px] font-semibold tabular-nums">62 660 ₽</div>
                    <div className="h-[3px] rounded-full bg-white/10 mt-1.5 overflow-hidden">
                      <div className="h-full" style={{ width: '78%', background: ACCENT }} />
                    </div>
                  </div>
                </aside>
                {/* main */}
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[10px] text-[#6B7080]">Привет, Аня 👋</div>
                      <div className="text-[15px] font-semibold">Май 2026</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white border border-[#E7E4DA] text-[10px]">‹ Май 2026 ›</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { lbl: 'Баланс',  val: '259 450 ₽', tone: 'text-[#171821]', tint: 'bg-[#EEF0FF]', trend: '+12%' },
                      { lbl: 'Доход',   val: '145 000 ₽', tone: 'text-income',    tint: 'bg-[#E8F7EE]', trend: '+4.3%' },
                      { lbl: 'Расход',  val: '82 340 ₽',  tone: 'text-expense',   tint: 'bg-[#FDECEC]', trend: '−5.1%' },
                      { lbl: 'Свободно',val: '62 660 ₽',  tone: 'text-brand-600', tint: 'bg-[#EEEBFB]', trend: '43%' },
                    ].map((c) => (
                      <div key={c.lbl} className={`rounded-lg p-2.5 ${c.tint}`}>
                        <div className="text-[9px] text-[#6B7080]">{c.lbl}</div>
                        <div className={`text-[12px] font-semibold tabular-nums ${c.tone}`}>{c.val}</div>
                        <div className="text-[9px] text-[#6B7080] mt-0.5">{c.trend}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white border border-[#E7E4DA] p-3">
                      <div className="text-[10px] font-semibold mb-2">Доход и расход · 6 мес.</div>
                      <div className="flex items-end gap-2 h-[64px]">
                        {[
                          [46,28],[48,34],[50,24],[52,32],[56,30],[62,26],
                        ].map(([inH, outH], i) => (
                          <div key={i} className="flex-1 flex flex-col gap-0.5 justify-end">
                            <div style={{ height: inH, background: INCOME, borderRadius: 2 }} />
                            <div style={{ height: outH, background: EXPENSE, opacity: 0.7, borderRadius: 2 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-[#E7E4DA] p-3">
                      <div className="text-[10px] font-semibold mb-2">Топ категорий</div>
                      <div className="space-y-1.5">
                        {[
                          ['Аренда', '#6366F1', '45 000 ₽'],
                          ['Продукты', '#F59E0B', '12 480 ₽'],
                          ['Кафе', '#EC4899', '8 890 ₽'],
                          ['Транспорт', '#0EA5E9', '6 240 ₽'],
                          ['Развлечения', '#A855F7', '5 800 ₽'],
                        ].map(([n, c, a]) => (
                          <div key={n} className="flex items-center gap-2 text-[10px]">
                            <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
                            <span className="flex-1">{n}</span>
                            <span className="font-medium tabular-nums">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES (dark bento) ─── */}
      <section id="features" className="py-24 bg-[#181B26] text-white">
        <div className="max-w-[1240px] mx-auto px-6">
          <Eyebrow dark>Возможности</Eyebrow>
          <SectionTitle dark>Всё, что нужно, чтобы перестать гадать.</SectionTitle>
          <SectionLead dark>
            Шесть инструментов, которые работают вместе. Без перегруза, без банковских порталов из 2010.
          </SectionLead>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[180px]">
            {/* Tall: Budgets */}
            <article className="md:col-span-2 md:row-span-2 rounded-2xl bg-[#2A2D3C] border border-white/[0.07] p-7 flex flex-col">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-medium w-fit">
                <span className="w-2 h-2 rounded-sm" style={{ background: ACCENT }} /> Бюджеты
              </span>
              <h3 className="font-display text-[28px] font-bold leading-tight mt-3 mb-2">
                Лимиты, которые не выбешивают.
              </h3>
              <p className="text-[15px] text-[#B5B9CC] leading-relaxed">
                Поставили 10 000 ₽ на кафе — Бабкосчёт цветом подскажет,
                как близко вы к лимиту. Зелёный, жёлтый на 80%, красный за 100%.
                Без капслока и push-нотификаций по ночам.
              </p>
              <div className="mt-auto pt-6 space-y-3">
                {[
                  ['Кафе и рестораны', '8 890 / 10 000 ₽', 89, WARN],
                  ['Продукты',         '12 480 / 20 000 ₽', 62, INCOME],
                  ['Развлечения',      '5 800 / 5 000 ₽',  100, EXPENSE],
                ].map(([name, pct, w, col]) => (
                  <div key={name as string}>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-medium">{name}</span>
                      <span className="text-[#9298AC] tabular-nums">{pct}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: col as string }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Wide: Accounts */}
            <article className="md:col-span-4 rounded-2xl bg-[#2A2D3C] border border-white/[0.07] p-7">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-medium w-fit">
                <span className="w-2 h-2 rounded-sm" style={{ background: INCOME }} /> Счета
              </span>
              <h3 className="font-display text-[24px] font-bold mt-3 mb-2">Карты, наличка, копилка — в одном месте.</h3>
              <p className="text-[14px] text-[#B5B9CC] leading-relaxed mb-3">
                Тинькофф, Сбер, наличные из кармана, PayPal на фриланс. Видите общий баланс одной цифрой.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Тинькофф · 184 500 ₽', '#1E2235', true],
                  ['Сбер · 62 300 ₽', INCOME, false],
                  ['Наличные · 12 650 ₽', WARN, false],
                  ['Копилка · 62 660 ₽', ACCENT, false],
                  ['PayPal · $340', SKY, false],
                ].map(([label, color, hollow]) => (
                  <div
                    key={label as string}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E2235] border border-white/[0.10] text-[12px]"
                  >
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={hollow
                        ? { background: '#1E2235', border: '1px solid rgba(255,255,255,0.3)' }
                        : { background: color as string }}
                    />
                    {label}
                  </div>
                ))}
              </div>
            </article>

            {/* Md: Categories */}
            <article className="md:col-span-2 rounded-2xl bg-[#2A2D3C] border border-white/[0.07] p-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-medium w-fit">
                <span className="w-2 h-2 rounded-sm" style={{ background: PINK }} /> Категории
              </span>
              <h3 className="font-display text-[20px] font-bold mt-3 mb-1.5">Свои категории, ваш порядок.</h3>
              <p className="text-[13px] text-[#B5B9CC]">Готовый набор «Продукты / Кафе / Транспорт» и добавьте своё — иконка, цвет, пара кликов.</p>
            </article>

            {/* Md: Goals */}
            <article className="md:col-span-2 rounded-2xl bg-[#2A2D3C] border border-white/[0.07] p-6 flex flex-col">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-medium w-fit">
                <span className="w-2 h-2 rounded-sm" style={{ background: VIOLET }} /> Цели
              </span>
              <h3 className="font-display text-[20px] font-bold mt-3 mb-1.5">Копилка на мечту.</h3>
              <p className="text-[13px] text-[#B5B9CC]">Прогресс-бар, который радует. И ещё чуть-чуть до Бали.</p>
              <div className="mt-auto pt-4 flex items-center gap-2.5">
                <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full" style={{ width: '78%', background: ACCENT }} />
                </div>
                <span className="text-[12px] font-medium tabular-nums">78%</span>
              </div>
            </article>

            {/* Md: Reports */}
            <article className="md:col-span-2 rounded-2xl bg-[#2A2D3C] border border-white/[0.07] p-6 flex flex-col">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-medium w-fit">
                <span className="w-2 h-2 rounded-sm" style={{ background: WARN }} /> Отчёты
              </span>
              <h3 className="font-display text-[20px] font-bold mt-3 mb-1.5">Куда ушла зарплата.</h3>
              <p className="text-[13px] text-[#B5B9CC]">На аренду, на еду, на вот это. Без сюрпризов.</p>
              <div className="mt-auto pt-4 flex items-end gap-1.5 h-[56px]">
                {[30, 48, 36, 82, 54, 70, 44, 60].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h}%`,
                      background: i === 3 ? ACCENT : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </div>
            </article>

            {/* Wide: Privacy */}
            <article className="md:col-span-6 rounded-2xl bg-[#2A2D3C] border border-white/[0.07] p-7">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-medium w-fit">
                <span className="w-2 h-2 rounded-sm" style={{ background: SKY }} /> Приватность
              </span>
              <h3 className="font-display text-[24px] font-bold mt-3 mb-2">
                Никаких партнёрок с банками. Никакой рекламы.
              </h3>
              <p className="text-[14px] text-[#B5B9CC] leading-relaxed max-w-[820px]">
                Данные ваши и лежат у вас. Мы их не продаём, не берём комиссии с банков и не подсовываем
                «выгодные предложения» от партнёров. Бабкосчёт бесплатный, потому что считать свои
                деньги — это нормально, а не премиум-фича.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['🔐 HTTPS-by-default', '🚫 Ноль трекеров', '📁 Экспорт CSV/JSON в 1 клик', '✅ Открытый код'].map((t) => (
                  <span key={t} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#181B26] border border-white/[0.10] text-[12px]">
                    {t}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ─── PERSONAS ─── */}
      <section id="personas" className="py-24">
        <div className="max-w-[1240px] mx-auto px-6">
          <Eyebrow>Для кого</Eyebrow>
          <SectionTitle>Если вам 22, 27 или просто стыдно за «Историю заказов».</SectionTitle>
          <SectionLead>
            Бабкосчёт сделан для тех, кто только начал получать нормальные деньги и ещё не до конца
            понимает, куда они исчезают между 5-м и 25-м.
          </SectionLead>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                avatar: '🎓', tone: INCOME,
                name: 'Соня, 22', role: 'Студентка, подработка',
                quote: '«К концу недели на карте 387 рублей. Куда улетели — без понятия.»',
                pains: [
                  'Стипендия + подработка + переводы от мамы — всё в одном балансе.',
                  'Лимит «на кофе и шаверму», который правда работает.',
                  'Цель на новый MacBook — видно прогресс каждую неделю.',
                ],
                cta: 'Завести бюджет студента →',
              },
              {
                avatar: '💼', tone: ACCENT,
                name: 'Аня, 27', role: 'Дизайнер в продукте',
                quote: '«Зарабатываю прилично, а на первый взнос за квартиру никак не соберу.»',
                pains: [
                  'Зарплата + бонусы — автоматически в копилку до того, как увидите.',
                  'Аренда, доставка, такси — отдельные категории с лимитами.',
                  'Отчёт «куда уходит ЗП» — и трезвый план на месяц.',
                ],
                cta: 'Накопить на взнос →',
              },
              {
                avatar: '💻', tone: WARN,
                name: 'Костя, 29', role: 'Фрилансер, дизайн + код',
                quote: '«В марте отлично, в апреле — ничего. Как планировать?»',
                pains: [
                  'Доходы в разных валютах: ₽, $, € — один общий баланс.',
                  '«Подушка» как цель — видно, на сколько месяцев хватит.',
                  'Налоги отдельной кучкой, чтобы не потратить случайно.',
                ],
                cta: 'Прожить пустой месяц →',
              },
            ].map((p) => (
              <article key={p.name} className="rounded-2xl bg-white border border-[#E7E4DA] p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl grid place-items-center text-2xl flex-shrink-0"
                    style={{ background: hexA(p.tone, 0.18), color: p.tone }}
                  >
                    {p.avatar}
                  </div>
                  <div>
                    <h3 className="font-display text-[18px] font-bold leading-tight">{p.name}</h3>
                    <div className="text-[13px] text-[#6B7080]">{p.role}</div>
                  </div>
                </div>
                <div className="text-[15px] italic text-[#2A2D3C] mb-4 leading-relaxed">{p.quote}</div>
                <ul className="space-y-2.5 mb-5">
                  {p.pains.map((pain, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] text-[#2A2D3C] leading-relaxed">
                      <span
                        className="w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                        style={{ background: hexA(p.tone, 0.14), color: p.tone }}
                      >₽</span>
                      <span>{pain}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="mt-auto text-[14px] font-semibold text-brand-600 hover:underline"
                >
                  {p.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <div className="px-6 pb-20">
        <div
          className="max-w-[1240px] mx-auto rounded-3xl p-12 md:p-16 relative overflow-hidden text-white"
          style={{ background: 'linear-gradient(135deg, #1E2235, #2A2D3C)' }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${hexA(ACCENT, 0.35)}, transparent 70%)` }}
          />
          <div className="relative max-w-[720px]">
            <h2 className="font-display text-[40px] md:text-[56px] font-extrabold tracking-[-0.02em] leading-[1.05]">
              Хватит гадать.<br />Узнайте, наконец.
            </h2>
            <p className="mt-5 text-[16px] text-[#B5B9CC] leading-relaxed max-w-[560px]">
              2 минуты на настройку, 5 счетов в одном месте, ноль рублей в месяц.
              Никаких подвохов — просто хороший инструмент, который мы сделали для себя.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center h-14 px-7 rounded-2xl bg-brand-600 text-white text-[16px] font-semibold hover:bg-brand-700"
                style={{ boxShadow: `0 10px 24px -10px ${ACCENT}` }}
              >
                Начать бесплатно →
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center h-14 px-7 rounded-2xl text-white text-[16px] font-medium border border-white/[0.18] hover:bg-white/[0.05]"
              >
                Посмотреть демо
              </a>
              <span className="text-[13px] text-[#7A809B] ml-1">Без карты, без банка.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[#E7E4DA] py-12">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-10">
            <div>
              <Link to="/" className="inline-flex items-center gap-2.5 font-semibold text-[17px] tracking-tight">
                <span className="w-9 h-9 rounded-xl bg-brand-600 grid place-items-center text-white font-bold">₽</span>
                Бабкосчёт
              </Link>
              <p className="mt-4 text-[14px] text-[#6B7080] max-w-[360px] leading-relaxed">
                Инструмент для тех, кто хочет понимать, куда уходят деньги, и откладывать без боли.
                Сделан в Москве, 2026.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <h6 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B7080] mb-3">Продукт</h6>
                <ul className="space-y-2 text-[14px]">
                  <li><a href="#features" className="hover:text-brand-600">Возможности</a></li>
                  <li><Link to="/login" className="hover:text-brand-600">Войти</Link></li>
                  <li><Link to="/register" className="hover:text-brand-600">Регистрация</Link></li>
                </ul>
              </div>
              <div>
                <h6 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B7080] mb-3">Помощь</h6>
                <ul className="space-y-2 text-[14px]">
                  <li><a href="#preview" className="hover:text-brand-600">Интерфейс</a></li>
                  <li><a href="#personas" className="hover:text-brand-600">Для кого</a></li>
                </ul>
              </div>
              <div>
                <h6 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B7080] mb-3">Документы</h6>
                <ul className="space-y-2 text-[14px]">
                  <li><a href="#" className="hover:text-brand-600">Конфиденциальность</a></li>
                  <li><a href="#" className="hover:text-brand-600">Условия</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-[#E7E4DA] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6B7080]">
            <span>© 2026 Бабкосчёт. Сделано с любовью к чужим деньгам.</span>
            <span>Бесплатно. Навсегда.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
