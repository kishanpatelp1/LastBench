import { create } from 'zustand';
import { api } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  college: string | null;
  branch: string | null;
  year: number | null;
  bio: string | null;
  createdAt: string;
  _count?: { posts: number; comments: number };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (email, password) => {
    const result = await api.login({ email, password });
    api.setToken(result.token);
    set({ user: result.user as unknown as User, isAuthenticated: true });
  },

  register: async (data) => {
    const result = await api.register(data);
    api.setToken(result.token);
    set({ user: result.user as unknown as User, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.logout(); } catch { /* ignore */ }
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = api.getToken();
      if (!token) {
        set({ isLoading: false, user: null, isAuthenticated: false });
        return;
      }
      const user = await api.getMe();
      set({ user: user as unknown as User, isAuthenticated: true, isLoading: false });
    } catch {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
