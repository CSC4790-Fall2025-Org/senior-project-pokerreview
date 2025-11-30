// src/services/api/user.ts
import { AuthService } from './auth';

const API_BASE_URL =
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar_url?: string; // This is the property that was causing the issue if not present
  games_played: number;
  hands_played: number;
  hands_won: number;
  total_winnings: number;
  win_rate: number;
  avg_pot_won: number;
  last_played?: string;
  created_at: string;
}

export interface RecentGame {
  table_name: string;
  game_type: string;
  buy_in: number;
  final_chips: number;
  profit_loss: number;
  game_date: string;
}

export interface UserResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export interface GamesResponse {
  success: boolean;
  games?: RecentGame[];
  error?: string;
}

export class UserService {
  static async getProfile(): Promise<UserResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to fetch profile' };
      }
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async getUserHandHistory(limit: number = 20): Promise<any> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        console.error('No auth token found!');
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/users/hand-history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to fetch hand history' };
      }
    } catch (error) {
      console.error('Get hand history error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async updateProfile(profileData: Partial<UserProfile>): Promise<UserResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to update profile' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  static async getRecentGames(limit = 10): Promise<GamesResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/users/recent-games?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to fetch recent games' };
      }
    } catch (error) {
      console.error('Get recent games error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
  
  // ===============================================
  // NEW METHOD: UPLOAD AVATAR
  // ===============================================
  static async uploadAvatar(file: File): Promise<UserResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const formData = new FormData();
      // 'avatar' must match the field name used in the multer setup on the server
      formData.append('avatar', file); 

      const response = await fetch(`${API_BASE_URL}/api/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // IMPORTANT: Do NOT set 'Content-Type': 'multipart/form-data'. 
          // The browser handles this automatically and correctly for FormData.
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to upload avatar' };
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
}