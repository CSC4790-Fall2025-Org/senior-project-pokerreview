// src/services/api/table.ts - FIXED VERSION
import { AuthService } from './auth';

// Same-origin in prod; explicit URL only for dev
const API_BASE_URL =
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export interface TablePlayer {
  id: string;
  username: string;
  chips: number;
  position: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  cards?: string[];
  currentBet?: number;   // <-- add this
}

export interface TableSpectator {
  id: string;
  username: string;
  avatar_url?: string;
  joinedAt: string;
}

export interface TableData {
  id: string;
  templateId: string;
  name: string;
  gameType: string;
  maxPlayers: number;
  currentPlayers: number; // Make this required, not optional
  spectators: number; // Make this required, not optional
  smallBlind: number;
  bigBlind: number;
  buyInMin: number;
  buyInMax: number;
  status: 'waiting' | 'active' | 'finished';
  currentPot: number;
  gamePhase: string;
  dealerPosition?: number;
  currentPlayer?: string;
  lastRaiseAmount?: number;
  players: TablePlayer[];
  spectatorList?: TableSpectator[];
  communityCards: string[]; // Make this required, not optional
  userRole: 'player' | 'spectator' | 'none'; // Make this required, not optional
  createdAt: string;
  lastActivity: string;
}

export interface TableTemplate {
  id: string;
  name: string;
  description: string;
  gameType: string;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  buyInMin: number;
  buyInMax: number;
  skillLevel: string;
  aiPersonalities: string[];
  tableImage: string;
}

export interface TablesResponse {
  success: boolean;
  tables?: TableData[];
  error?: string;
}

export interface TableResponse {
  success: boolean;
  table?: TableData;
  error?: string;
}

export interface JoinResponse {
  success: boolean;
  message?: string;
  position?: number;
  error?: string;
}

export interface TemplatesResponse {
  success: boolean;
  templates?: TableTemplate[];
  error?: string;
}

export class TableService {
  // Get all active tables
  static async getTables(): Promise<TablesResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to fetch tables' };
      }
    } catch (error) {
      console.error('Get tables error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get specific table details
  static async getTable(tableId: string): Promise<TableResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to fetch table details' };
      }
    } catch (error) {
      console.error('Get table error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Join table as spectator
  static async joinAsSpectator(tableId: string): Promise<JoinResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}/spectate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to join as spectator' };
      }
    } catch (error) {
      console.error('Join as spectator error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Join table as player
  static async joinAsPlayer(tableId: string, buyInAmount: number): Promise<JoinResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ buyInAmount }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to join as player' };
      }
    } catch (error) {
      console.error('Join as player error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Leave table
  static async leaveTable(tableId: string): Promise<JoinResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to leave table' };
      }
    } catch (error) {
      console.error('Leave table error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get table templates
  static async getTableTemplates(): Promise<TemplatesResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables/templates/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to fetch table templates' };
      }
    } catch (error) {
      console.error('Get table templates error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
  // Add these methods to your existing TableService class in src/services/api/table.ts

  // Player action in game
  static async playerAction(tableId: string, action: string, amount?: number): Promise<JoinResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const body: any = { action };
      if (amount !== undefined && amount > 0) {
        body.amount = amount;
      }

      console.log('Making player action:', { tableId, action, amount, body });

      const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Player action response:', data);
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to perform action' };
      }
    } catch (error) {
      console.error('Player action error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Get game state
  static async getGameState(tableId: string): Promise<any> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`${API_BASE_URL}/api/tables/${tableId}/game-state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        return { success: false, error: data.error || 'Failed to get game state' };
      }
    } catch (error) {
      console.error('Get game state error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }
}