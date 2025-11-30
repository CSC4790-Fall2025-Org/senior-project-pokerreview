const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export interface UserStats {
  bankroll: number;
  gamesPlayed: number;
  handsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  winRate: number;
  avgPotWon: number;
  biggestPot: number;
  lastPlayed: string | null;
}

export class StatsService {
  static async getUserStats(): Promise<{ success: boolean; stats?: UserStats; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/api/users/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return { success: true, stats: data.stats };
      } else {
        return { success: false, error: data.error || 'Failed to load stats' };
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      return { success: false, error: 'Network error' };
    }
  }
}