import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem { to: string; label: string; icon: string; }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',    label: 'Главная',    icon: '🏠' },
  { to: '/transactions', label: 'Операции',   icon: '💳' },
  { to: '/budgets',      label: 'Бюджеты',    icon: '🎯' },
  { to: '/reports',      label: 'Отчёты',     icon: '📊' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar — desktop only */}
      <aside className={cn(
        'hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200',
        sidebarOpen ? 'w-60' : 'w-16'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            Ф
          </div>
          {sidebarOpen && (
            <span className="ml-3 font-semibold text-gray-900 dark:text-white truncate">ФинансыПро</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex-shrink-0">{theme === 'dark' ? '☀️' : '🌙'}</span>
            {sidebarOpen && <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <span className="flex-shrink-0">🚪</span>
            {sidebarOpen && <span>Выйти</span>}
          </button>
          {sidebarOpen && user && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-500 truncate">
              {user.email}
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute left-0 bottom-24 ml-[calc(100%-12px)] w-6 h-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center text-xs text-gray-500 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hidden md:flex"
          style={{ position: 'relative', marginLeft: 'auto', marginRight: 'auto', display: 'flex' }}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 flex-shrink-0 gap-3">
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ☰
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            {user?.fullName ?? user?.email}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
