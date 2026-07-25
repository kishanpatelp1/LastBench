import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

const initialDark = typeof localStorage !== 'undefined' ? localStorage.getItem('lastbench-theme') !== 'light' : true;
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', initialDark);
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialDark,

  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem('lastbench-theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return { isDark: next };
    }),

  setDark: (dark) => {
    localStorage.setItem('lastbench-theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
    set({ isDark: dark });
  },
}));
