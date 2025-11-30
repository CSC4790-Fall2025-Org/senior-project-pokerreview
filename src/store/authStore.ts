import { create } from 'zustand';
import { AuthState, LoginCredentials, RegisterCredentials } from '../types/auth';
import { AuthService } from '../services/api/auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  updateUser: (newUserData) => {
    set((state) => ({
      user: state.user 
        ? { ...state.user, ...newUserData } 
        : null,
    }));
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    
    const response = await AuthService.login(credentials);
    
    if (response.success && response.user) {
      set({ 
        user: response.user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      });
    } else {
      set({ 
        error: response.error || 'Login failed', 
        isLoading: false 
      });
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true, error: null });
    
    const response = await AuthService.register(credentials);
    
    if (response.success && response.user) {
      set({ 
        user: response.user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      });
    } else {
      set({ 
        error: response.error || 'Registration failed', 
        isLoading: false 
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await AuthService.logout();
    set({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false,
      error: null 
    });
  },

  initializeAuth: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));