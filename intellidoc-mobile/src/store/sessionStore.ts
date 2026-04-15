// ─────────────────────────────────────────────────────────────────────────────
// Session Store (Zustand)
// Manages: current user, session cookie, auth state
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { User } from '../types';
import { login, logout, register, verifyOtp, getCurrentUser, forgotPassword, resetPassword } from '../api/auth';
import { loadSessionCookie, rehydrateCookieJar } from '../lib/secureStore';

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  // Actions
  restoreSession: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, password: string) => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  hasHydrated: false,
  error: null,

  /**
   * Called on cold start: reads SecureStore → rehydrates cookie jar → validates session.
   * Returns true if a valid session was found.
   */
  restoreSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const isWeb = typeof navigator !== 'undefined' && navigator.product !== 'ReactNative';
      
      if (!isWeb) {
        const stored = await loadSessionCookie();
        if (!stored) {
          set({ isAuthenticated: false, isLoading: false, hasHydrated: true });
          return false;
        }
        // Rehydrate native jar + get cookie header string
        await rehydrateCookieJar();
      }

      // Validate with NextAuth (on web, browser sends cookie automatically)
      const user = await getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false, hasHydrated: true });
      return true;
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false, hasHydrated: true });
      return false;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Login failed', isLoading: false });
      throw e;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await register(name, email, password);
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Registration failed', isLoading: false });
      throw e;
    }
  },

  verifyOtp: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const user = await verifyOtp(email, otp);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'OTP verification failed', isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await logout();
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await forgotPassword(email);
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to send reset email', isLoading: false });
      throw e;
    }
  },

  resetPassword: async (email, otp, password) => {
    set({ isLoading: true, error: null });
    try {
      await resetPassword(email, otp, password);
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to reset password', isLoading: false });
      throw e;
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearError: () => set({ error: null }),
}));
