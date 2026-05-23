import { ReactNode, ComponentType, SVGProps } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  IconHome, IconWallet, IconList, IconTarget, IconChart,
  IconSun, IconMoon, IconLogout, IconMenu, IconBell,
} from './NavIcons';
import { SavingsMini } from './SavingsMini';

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
interface NavItem { to: string; label: string; Icon: IconCmp; }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',    label: 'Главная',  Icon: IconHome   },
  { to: '/accounts',     label: 'Счета',    Icon: IconWallet },
  { to: '/transactions', label: 'Операции', Icon: IconList   },
  { to: '/budgets',      label: 'Бюджеты',  Icon: IconTarget },
  { to: '/reports',      label: 'Отчёты',   Icon: IconChart  },
];

// ── Logo with a brand ₽ pill — used across header & landing ───────────────
function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div
        className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center font-bold tracking-[-0.04em]"
        style={{ boxShadow: '0 6px 16px -6px #6366F1' }}
      >
        ₽
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-tight text-white truncate">Бабкосчёт</div>
          <div className="text-[11px] text-sidebarMute">Личные финансы</div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ to, label, Icon, collapsed }: NavItem & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-white/10 text-white font-medium'
            : 'text-[#B5B9CC] hover:bg-white/[0.04] hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute -left-2 top-2 bottom-2 w-[3px] rounded-full bg-brand-600"
            />
          )}
          <span className="flex-shrink-0"><Icon /></span>
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

function SidebarBtn({
  Icon, label, onClick, danger, collapsed,
}: {
  Icon: IconCmp; label: string; onClick: () => void; danger?: boolean; collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'w-full flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors',
        danger
          ? 'text-sidebarMute hover:bg-red-500/10 hover:text-red-400'
          : 'text-sidebarMute hover:bg-white/[0.05] hover:text-white'
      )}
    >
      <span className="flex-shrink-0"><Icon /></span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

// ── User pill in topbar — gradient avatar with initials + full name ──────
function initialsOf(name: string): string {
  const s = (name || '').trim();
  if (!s) return '?';
  const parts = s.split(/[\s.@_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}
function UserPill({ name }: { name: string }) {
  // Render the *full* name so screen readers + E2E selectors that look up
  // user.fullName via `getByText` keep working. CSS truncates visually,
  // but the text node stays whole in the DOM (and `title` exposes it on hover).
  return (
    <div
      className="hidden sm:flex items-center gap-2.5 pl-1 pr-3 py-1 bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] rounded-full max-w-[260px]"
      title={name}
    >
      <span
        className="w-8 h-8 rounded-full grid place-items-center text-[13px] font-semibold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6366F1, #4338CA)' }}
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
        {name}
      </span>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const collapsed = !sidebarOpen;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-cream dark:bg-[#0F1117] text-gray-900 dark:text-gray-100">
      {/* ── Sidebar (desktop, always dark) ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen',
          'bg-sidebar text-white',
          'transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-[244px]'
        )}
      >
        <div className="px-4 pt-7 pb-6">
          <Logo collapsed={collapsed} />
        </div>

        <nav className="flex flex-col gap-1 px-0">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="mt-auto pb-4 pt-3 border-t border-white/[0.05] flex flex-col gap-1">
          {/* Sidebar savings widget — universal "Копилка" pill (v3) */}
          <SavingsMini collapsed={collapsed} />
          <SidebarBtn
            Icon={theme === 'dark' ? IconSun : IconMoon}
            label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            onClick={toggleTheme}
            collapsed={collapsed}
          />
          <SidebarBtn Icon={IconLogout} label="Выйти" onClick={handleLogout} danger collapsed={collapsed} />
          {!collapsed && user && (
            <div className="px-5 pt-2 text-[11px] text-sidebarMute truncate">{user.email}</div>
          )}
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile + small action area on desktop) */}
        <header className="h-14 md:h-16 bg-white dark:bg-[#181B26] border-b border-gray-200 dark:border-[#262A3A] flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            aria-label="Свернуть меню"
            className="hidden md:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <IconMenu />
          </button>
          <div className="md:hidden flex items-center gap-2 font-semibold tracking-tight">
            <span className="w-7 h-7 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">₽</span>
            <span>Бабкосчёт</span>
          </div>
          <div className="flex-1" />

          {/* Bell — notification dot in brand colour, v3 style */}
          <button
            type="button"
            aria-label="Уведомления"
            className="relative w-10 h-10 rounded-xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-[#262A3A] grid place-items-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            <IconBell />
            <span
              aria-hidden="true"
              className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-brand-600"
              style={{ boxShadow: '0 0 0 2px #fff' }}
            />
          </button>

          {/* User pill — gradient avatar + name (initials fallback). */}
          <UserPill name={user?.fullName ?? user?.email ?? ''} />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav — same nav items, brand accent for active */}
        <nav className="md:hidden flex border-t border-gray-200 dark:border-[#262A3A] bg-white dark:bg-[#181B26]">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand-600 dark:text-brand-500' : 'text-gray-500 dark:text-gray-400'
                )
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
