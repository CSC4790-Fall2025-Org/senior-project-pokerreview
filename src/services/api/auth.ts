import { LoginCredentials, RegisterCredentials, User } from '../../types/auth';

const API_BASE_URL =
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export class AuthService {
  // ✅ Use consistent key name
  private static TOKEN_KEY = 'auth_token';

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // ✅ CRITICAL: Clear ALL possible token keys first
      this.clearAllTokens();
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.token) {
          localStorage.setItem(this.TOKEN_KEY, data.token);
          console.log('✅ Token stored for user:', data.user?.username);
        }
        return data;
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      this.clearAllTokens();
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      if (credentials.password !== credentials.confirmPassword) {
        return { success: false, error: 'Passwords do not match' };
      }

      if (credentials.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      // ✅ CRITICAL: Clear ALL possible token keys first
      this.clearAllTokens();

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.token) {
          localStorage.setItem(this.TOKEN_KEY, data.token);
          console.log('✅ Token stored for new user:', data.user?.username);
        }
        return data;
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.clearAllTokens();
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // ✅ CRITICAL: Clear all possible token keys
      this.clearAllTokens();
      console.log('✅ Logout complete - All tokens cleared');
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) {
        this.clearAllTokens();
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      } else {
        this.clearAllTokens();
        return null;
      }
    } catch (error) {
      console.error('Get current user error:', error);
      this.clearAllTokens();
      return null;
    }
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ✅ NEW: Clear all possible token keys to prevent mixing
  private static clearAllTokens(): void {
    // Clear all possible token key variations
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    console.log('🧹 Cleared all auth storage');
  }
}