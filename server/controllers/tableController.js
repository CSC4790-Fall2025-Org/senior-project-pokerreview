// server/controllers/tableController.js - WITH GAME ACTIONS
console.log('🔧 DEBUG: Loading tableController.js');
const TableService = require('../services/tableService');

console.log('🔧 DEBUG: TableService loaded:', typeof TableService);
console.log('🔧 DEBUG: TableService.getActiveTables:', typeof TableService.getActiveTables);

class TableController {
  // Get all active tables for dashboard
  static async getTables(req, res) {
    try {
      console.log('=== TableController.getTables called ===');
      
      const tables = TableService.getActiveTables();
      
      // Transform tables for frontend display
      const displayTables = tables.map(table => ({
        id: table.id,
        templateId: table.templateId,
        name: table.name,
        gameType: table.gameType,
        maxPlayers: table.maxPlayers,
        currentPlayers: table.players.length,
        spectators: table.spectators.length,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind,
        buyInMin: table.buyInMin,
        buyInMax: table.buyInMax,
        status: table.status,
        currentPot: table.currentPot,
        gamePhase: table.gamePhase,
        players: table.players.map(player => ({
          id: player.id,
          username: player.username,
          avatar_url: player.avatar_url,
          position: player.position,
          chips: player.chips,
          isDealer: player.isDealer,
          isSmallBlind: player.isSmallBlind,
          isBigBlind: player.isBigBlind,
          isActive: player.isActive
        })),
        lastActivity: table.lastActivity
      }));
      
      res.json({
        success: true,
        tables: displayTables
      });
    } catch (error) {
      console.error('Get tables error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tables'
      });
    }
  }

  // Get specific table details
  static async getTable(req, res) {
    try {
      const { tableId } = req.params;
      console.log('=== TableController.getTable called ===', { tableId });
      
      const table = TableService.getTable(tableId);
      
      if (!table) {
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }
      
      // Check if user is player or spectator
      const userId = req.user.userId.toString();
      const isPlayer = table.players.some(p => p.id === userId);
      const isSpectator = table.spectators.some(s => s.id === userId);

      console.log('=== TABLE DEBUG ===');
      console.log('table.currentPlayer:', table.currentPlayer);
      console.log('requesting userId:', userId);
      console.log('table.players:', table.players.map(p => ({ id: p.id, username: p.username })));
      console.log('table.gamePhase:', table.gamePhase);
      console.log('table.status:', table.status);
      console.log('==================');
      
      const response = {
        id: table.id,
        templateId: table.templateId,
        name: table.name,
        gameType: table.gameType,
        maxPlayers: table.maxPlayers,
        smallBlind: table.smallBlind,
        bigBlind: table.bigBlind,
        buyInMin: table.buyInMin,
        buyInMax: table.buyInMax,
        status: table.status,
        currentPot: table.currentPot,
        gamePhase: table.gamePhase,
        dealerPosition: table.dealerPosition,
        currentPlayer: table.currentPlayer,
        players: table.players.map(player => ({
          id: player.id,
          username: player.username,
          avatar_url: player.avatar_url,
          position: player.position,
          chips: player.chips,
          isDealer: player.isDealer,
          isSmallBlind: player.isSmallBlind,
          isBigBlind: player.isBigBlind,
          isActive: player.isActive,
          hasActed: player.hasActed,
          action: player.action,
          currentBet: player.currentBet,
          isFolded: player.isFolded,
          isAllIn: player.isAllIn,
          // Only show cards to the player themselves
          cards: player.id === userId ? (player.cards || []) : []
        })),
        spectators: table.spectators.map(spec => ({
          id: spec.id,
          username: spec.username,
          avatar_url: spec.avatar_url,
          joinedAt: spec.joinedAt
        })),
        communityCards: table.communityCards || [],
        userRole: isPlayer ? 'player' : (isSpectator ? 'spectator' : 'none'),
        createdAt: table.createdAt,
        lastActivity: table.lastActivity
      };

      console.log('=== RESPONSE DEBUG ===');
      console.log('response.currentPlayer:', response.currentPlayer);
      console.log('====================');
      res.json({
        success: true,
        table: response
      });
    } catch (error) {
      console.error('Get table error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch table details'
      });
    }
  }

  // Join table as spectator
  static async joinAsSpectator(req, res) {
    try {
      const { tableId } = req.params;
      console.log('=== TableController.joinAsSpectator called ===', { 
        tableId, 
        userId: req.user.userId 
      });
      
      const success = TableService.joinAsSpectator(tableId, {
        id: req.user.userId,
        username: req.user.username,
        avatar_url: req.user.avatar_url
      });
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Successfully joined as spectator'
      });
    } catch (error) {
      console.error('Join as spectator error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join table as spectator'
      });
    }
  }

  // Join table as player
  static async joinAsPlayer(req, res) {
    try {
      const { tableId } = req.params;
      const { buyInAmount } = req.body;
      
      console.log('=== TableController.joinAsPlayer called ===', { 
        tableId, 
        userId: req.user.userId,
        buyInAmount 
      });
      
      if (!buyInAmount || buyInAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid buy-in amount is required'
        });
      }
      
      const result = TableService.joinAsPlayer(
      tableId, 
      {
        id: req.user.userId.toString(), // Ensure string
        username: req.user.username,
        avatar_url: req.user.avatar_url
      },
      buyInAmount
    );
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      // Check if table is now full and create duplicate
      const table = TableService.getTable(tableId);
      if (table && table.players.length >= table.maxPlayers) {
        console.log('Table is full, creating duplicate...');
        TableService.createDuplicateTable(table.templateId);
      }
      
      res.json({
        success: true,
        message: 'Successfully joined table as player',
        position: result.position
      });
    } catch (error) {
      console.error('Join as player error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join table as player'
      });
    }
  }

  // Player game action (fold, call, raise, check, all-in)
  static async playerAction(req, res) {
    try {
      const { tableId } = req.params;
      const { action, amount } = req.body;
      
      console.log('=== TableController.playerAction called ===', { 
        tableId, 
        userId: req.user.userId,
        action,
        amount
      });
      
      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Action is required'
        });
      }
      
      const validActions = ['fold', 'call', 'bet', 'raise', 'check'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
      }
      
      if ((action === 'raise' || action === 'bet') && (!amount || amount <= 0)) {
        return res.status(400).json({
          success: false,
          error: 'Raise amount is required'
        });
      }
      
      const result = TableService.playerAction(
        tableId,
        req.user.userId.toString(), // Ensure string
        action,
        amount
      );
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      res.json({
        success: true,
        message: `Action ${action} successful`,
        gameState: result.gameState
      });
    } catch (error) {
      console.error('Player action error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process player action'
      });
    }
  }

  // Leave table
  static async leaveTable(req, res) {
    try {
      const { tableId } = req.params;
      console.log('=== TableController.leaveTable called ===', { 
        tableId, 
        userId: req.user.userId 
      });
      
      const success = TableService.leaveTable(tableId, req.user.userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Successfully left table'
      });
    } catch (error) {
      console.error('Leave table error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to leave table'
      });
    }
  }

  // Get available table templates
  static async getTableTemplates(req, res) {
    try {
      console.log('=== TableController.getTableTemplates called ===');
      
      const templates = TableService.getTableTemplates();
      
      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Get table templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch table templates'
      });
    }
  }

  // Get game state for a table
  static async getGameState(req, res) {
    try {
      const { tableId } = req.params;
      console.log('=== TableController.getGameState called ===', { tableId });
      
      const gameState = TableService.getGameState(tableId);
      
      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: 'No active game found'
        });
      }
      
      res.json({
        success: true,
        gameState
      });
    } catch (error) {
      console.error('Get game state error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch game state'
      });
    }
  }
}

console.log('🔧 DEBUG: TableController class defined');

module.exports = TableController;