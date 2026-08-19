import { create } from 'zustand';
import { api } from '../lib/api-client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<{ requireVerification?: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (email, password) => {
    // Cookie is set by the server; we only need the user object
    const result = await api.login({ email, password });
    set({ user: result.user, isAuthenticated: true });
  },

  register: async (data) => {
    const result = await api.register(data);
    if (!result.requireVerification) {
      set({ user: result.user, isAuthenticated: true });
    }
    return result;
  },

  logout: async () => {
    try {
      // Server clears the httpOnly cookie via Set-Cookie: session=; Max-Age=0
      await api.logout();
    } catch { /* ignore network errors on logout */ }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      // No token to read — the httpOnly cookie is sent automatically by the browser
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // Cookie missing, expired, or invalid — treat as unauthenticated
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

