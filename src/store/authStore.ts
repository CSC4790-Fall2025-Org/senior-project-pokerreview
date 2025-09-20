import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginCredentials, RegisterCredentials } from '../types/auth';

const API_BASE = 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const msg = await response.text().catch(() => '');
            set({
              error: msg || `Login failed (${response.status})`,
              isLoading: false,
            });
            return;
          }

          const data = await response.json();

          if (!data.success || !data.user) {
            set({ error: data.error || 'Invalid login response', isLoading: false });
            return;
          }

          set({
            user: {
              id: data.user.id?.toString?.() ?? String(data.user.id),
              username: data.user.username,
              email: data.user.email,
              createdAt: data.user.created_at,
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          set({
            error: 'Login failed. Please check your credentials.',
            isLoading: false,
          });
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });

        try {
          if (credentials.password !== credentials.confirmPassword) {
            set({ error: 'Passwords do not match', isLoading: false });
            return;
          }

          // 1) Create user
          const signupRes = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!signupRes.ok) {
            const msg = await signupRes.text().catch(() => '');
            set({
              error: msg || `Registration failed (${signupRes.status})`,
              isLoading: false,
            });
            return;
          }

          const signupData = await signupRes.json();
          if (!signupData.success) {
            set({ error: signupData.error || 'Registration failed', isLoading: false });
            return;
          }

          // 2) Auto-login
          const loginRes = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!loginRes.ok) {
            const msg = await loginRes.text().catch(() => '');
            set({
              error: msg || `Auto-login failed (${loginRes.status})`,
              isLoading: false,
            });
            return;
          }

          const loginData = await loginRes.json();
          if (!loginData.success || !loginData.user) {
            set({ error: loginData.error || 'Auto-login failed', isLoading: false });
            return;
          }

          set({
            user: {
              id: loginData.user.id?.toString?.() ?? String(loginData.user.id),
              username: loginData.user.username,
              email: loginData.user.email,
              createdAt: loginData.user.created_at,
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          set({
            error: 'Registration failed. Please try again.',
            isLoading: false,
          });
        }
      },

      updateProfile: async (updates: { username?: string; email?: string }) => {
        const state = get();
        if (!state.user?.id) {
          set({ error: 'Not authenticated' });
          return false;
        }
        set({ isLoading: true, error: null });

        try {
          const resp = await fetch(`${API_BASE}/users/${state.user.id}`, { // use API_BASE
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!resp.ok) {
            const msg = await resp.text().catch(() => '');
            set({ error: msg || `Update failed (${resp.status})`, isLoading: false });
            return false; // <- return a boolean
          }

          const data = await resp.json();
          if (!data.success || !data.user) {
            set({ error: data.error || 'Update failed', isLoading: false });
            return false; // <- return a boolean
          }

          set({
            user: {
              id: data.user.id.toString(),
              username: data.user.username,
              email: data.user.email,
              createdAt: data.user.created_at,
            },
            isLoading: false,
            error: null,
          });
          return true; // <- success
        } catch {
          set({ error: 'Network error updating profile', isLoading: false });
          return false; // <- return a boolean
        }
      },



      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
