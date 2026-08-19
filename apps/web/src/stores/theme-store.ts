import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  theme: 'dark' | 'light';
  toggle: () => void;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const initialDark = typeof localStorage !== 'undefined' ? localStorage.getItem('lastbench-theme') !== 'light' : true;
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', initialDark);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: initialDark,
  theme: initialDark ? 'dark' : 'light',

  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem('lastbench-theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return { isDark: next, theme: next ? 'dark' : 'light' };
    }),

  // Alias — consumers use both names; keep only one implementation
  toggleTheme: () => get().toggle(),

  setDark: (dark) => {
    localStorage.setItem('lastbench-theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
    set({ isDark: dark, theme: dark ? 'dark' : 'light' });
  },
}));
