export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  avatar_url?: string;
  bankroll?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  biggestWin?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  updateUser: (newUserData: Partial<User>) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}