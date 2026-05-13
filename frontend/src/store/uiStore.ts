import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      toggleTheme: () => set(s => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', next === 'dark');
        return { theme: next };
      }),
    }),
    { name: 'ui-store', onRehydrateStorage: () => (state) => {
      if (state?.theme === 'dark') document.documentElement.classList.add('dark');
    }}
  )
);
