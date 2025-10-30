// server/services/tableService.js - WITH POKER GAME ENGINE
console.log('🔧 DEBUG: Loading tableService.js');
const { PokerGame } = require('./pokerEngine');

class TableService {
  static activeTables = new Map();
  static activeGames = new Map(); // Store actual poker games
  
  // Table templates
  static TABLE_TEMPLATES = [
    {
      id: 'beginner-friendly',
      name: "Beginner's Paradise",
      description: "Perfect for new players learning the ropes",
      gameType: 'no-limit-holdem',
      maxPlayers: 6,
      smallBlind: 5,
      bigBlind: 10,
      buyInMin: 200,
      buyInMax: 1000,
      skillLevel: 'beginner',
      aiPersonalities: ['conservative', 'teaching'],
      tableImage: '/poker_table_green.png'
    },
    {
      id: 'casual-cash',
      name: "Casual Cash Game",
      description: "Relaxed atmosphere for friendly competition",
      gameType: 'no-limit-holdem',
      maxPlayers: 8,
      smallBlind: 10,
      bigBlind: 20,
      buyInMin: 500,
      buyInMax: 2000,
      skillLevel: 'intermediate',
      aiPersonalities: ['balanced', 'social'],
      tableImage: '/poker_table_blue.png'
    },
    {
      id: 'high-stakes',
      name: "High Stakes Championship",
      description: "For experienced players seeking big wins",
      gameType: 'no-limit-holdem',
      maxPlayers: 9,
      smallBlind: 50,
      bigBlind: 100,
      buyInMin: 5000,
      buyInMax: 25000,
      skillLevel: 'high-stakes',
      aiPersonalities: ['aggressive', 'analytical'],
      tableImage: '/poker_table_gold.png'
    },
    {
      id: 'tournament-style',
      name: "Tournament Training",
      description: "Practice tournament strategy",
      gameType: 'tournament',
      maxPlayers: 8,
      smallBlind: 25,
      bigBlind: 50,
      buyInMin: 1000,
      buyInMax: 1000,
      skillLevel: 'intermediate',
      aiPersonalities: ['tournament', 'adaptive'],
      tableImage: '/poker_table_red.png'
    },
    {
      id: 'quick-play',
      name: "Quick Play",
      description: "Fast-paced games for busy schedules",
      gameType: 'no-limit-holdem',
      maxPlayers: 6,
      smallBlind: 25,
      bigBlind: 50,
      buyInMin: 1000,
      buyInMax: 5000,
      skillLevel: 'intermediate',
      aiPersonalities: ['fast', 'aggressive'],
      tableImage: '/poker_table_purple.png'
    },
    {
      id: 'vip-exclusive',
      name: "VIP Exclusive Room",
      description: "Premium experience for serious players",
      gameType: 'no-limit-holdem',
      maxPlayers: 9,
      smallBlind: 100,
      bigBlind: 200,
      buyInMin: 10000,
      buyInMax: 50000,
      skillLevel: 'advanced',
      aiPersonalities: ['professional', 'unpredictable'],
      tableImage: '/poker_table_black.png'
    }
  ];

  // Initialize predefined tables
  static initializeTables() {
    console.log('Initializing poker tables...');
    this.TABLE_TEMPLATES.forEach(template => {
      const table = this.createTableFromTemplate(template);
      this.activeTables.set(table.id, table);
      console.log(`Created table: ${template.name}`);
    });
    
    // Set up cleanup interval
    setInterval(() => {
      this.cleanupInactiveTables();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Create new table from template
  static createTableFromTemplate(template) {
    const tableId = `${template.id}-${Date.now()}`;
    
    return {
      id: tableId,
      templateId: template.id,
      name: template.name,
      gameType: template.gameType,
      maxPlayers: template.maxPlayers,
      smallBlind: template.smallBlind,
      bigBlind: template.bigBlind,
      buyInMin: template.buyInMin,
      buyInMax: template.buyInMax,
      status: 'waiting',
      players: [],
      spectators: [],
      currentPot: 0,
      communityCards: [],
      gamePhase: 'waiting',
      dealerPosition: 0,
      currentPlayer: null,
      createdAt: new Date(),
      lastActivity: new Date()
    };
  }

  // Get all active tables
  static getActiveTables() {
    return Array.from(this.activeTables.values()).map(table => {
      // If there's an active game, update table with game state
      const game = this.activeGames.get(table.id);
      if (game) {
        const gameState = game.getGameState();
        return {
          ...table,
          currentPot: gameState.pot,
          communityCards: gameState.communityCards,
          gamePhase: gameState.gamePhase,
          currentPlayer: gameState.currentPlayer,
          lastRaiseAmount: gameState.lastRaiseAmount,
          players: table.players.map(player => {
            const gamePlayer = gameState.players.find(gp => gp.id === player.id);
            if (gamePlayer) {
              return {
                ...player,
                ...gamePlayer,
                position: player.position, // ✅ Preserve table position
              };
            }
            return player;
          })
        };
      }
      return table;
    });
  }

  // Get table by ID
  static getTable(tableId) {
    const table = this.activeTables.get(tableId);
    if (!table) return null;

    // If there's an active game, merge game state
    const game = this.activeGames.get(tableId);
    if (game) {
      const gameState = game.getGameState();
      
      console.log('=== TABLE SERVICE DEBUG ===');
      console.log('gameState.currentPlayer:', gameState.currentPlayer);
      console.log('gameState.players:', gameState.players.map(p => ({ id: p.id, username: p.username })));
      console.log('===========================');
      
      return {
        ...table,
        currentPot: gameState.pot,
        communityCards: gameState.communityCards,
        gamePhase: gameState.gamePhase,
        currentPlayer: gameState.currentPlayer, // This should be the player ID from game engine
        lastRaiseAmount: gameState.lastRaiseAmount,
        dealerPosition: gameState.dealerPosition,
        players: table.players.map(player => {
          const gamePlayer = gameState.players.find(gp => gp.id === player.id);
          if (gamePlayer) {
            return {
              id: player.id,
              username: player.username,
              avatar_url: player.avatar_url,
              position: player.position, // ✅ CRITICAL: Use table's position
              chips: gamePlayer.chips,
              currentBet: gamePlayer.currentBet,
              isDealer: gamePlayer.isDealer,
              isSmallBlind: gamePlayer.isSmallBlind,
              isBigBlind: gamePlayer.isBigBlind,
              isFolded: gamePlayer.isFolded,
              isAllIn: gamePlayer.isAllIn,
              hasActed: gamePlayer.hasActed,
              action: gamePlayer.action,
              cards: gamePlayer.cards,
              isActive: player.isActive,
              lastSeen: player.lastSeen
            };
          }
          return player;
        })
      };
    }
    
    return table;
  }
  // Join as spectator
  static joinAsSpectator(tableId, user) {
    const table = this.activeTables.get(tableId);
    if (!table) return false;
    
    // Check if already spectating or playing
    if (table.spectators.find(s => s.id === user.id) || 
        table.players.find(p => p.id === user.id)) {
      return true;
    }
    
    table.spectators.push({
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      joinedAt: new Date()
    });
    
    table.lastActivity = new Date();
    console.log(`User ${user.username} joined table ${table.name} as spectator`);
    return true;
  }

  // Join as player
  static joinAsPlayer(tableId, user, buyInAmount) {
    const table = this.activeTables.get(tableId);
    if (!table) {
      return { success: false, error: 'Table not found' };
    }
    
    // Check if table is full
    if (table.players.length >= table.maxPlayers) {
      return { success: false, error: 'Table is full' };
    }
    
    // Validate buy-in
    if (buyInAmount < table.buyInMin || buyInAmount > table.buyInMax) {
      return { 
        success: false, 
        error: `Buy-in must be between ${table.buyInMin} and ${table.buyInMax}` 
      };
    }
    
    // Check if already playing
    if (table.players.find(p => p.id === user.id)) {
      return { success: false, error: 'Already playing at this table' };
    }
    
    // Find available position - CRITICAL: Check which positions are taken
    const occupiedPositions = new Set(table.players.map(p => p.position));
    let position = -1;
    
    // Find first available position from 0 to maxPlayers-1
    for (let i = 0; i < table.maxPlayers; i++) {
      if (!occupiedPositions.has(i)) {
        position = i;
        break;
      }
    }
    
    if (position === -1) {
      return { success: false, error: 'No available positions' };
    }
    
    // Add player with the assigned position
    const player = {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      chips: buyInAmount,
      position, // This position will be preserved
      isActive: true,
      hasActed: false,
      lastSeen: new Date(),
      cards: []
    };
    
    table.players.push(player);
    
    // Remove from spectators if they were spectating
    table.spectators = table.spectators.filter(s => s.id !== user.id);
    
    // Start game if minimum players reached
    if (table.players.length >= 2 && table.status === 'waiting') {
      table.status = 'active';
      this.startGame(table.id);
    }
    
    table.lastActivity = new Date();
    console.log(`User ${user.username} joined table ${table.name} as player at position ${position} with ${buyInAmount}`);
    
    return { success: true, position };
  }
  // Start a poker game
  static startGame(tableId) {
    const table = this.activeTables.get(tableId);
    if (!table) return false;
    
    console.log(`Starting poker game for table ${tableId}`);
    
    // Create new poker game instance
    const game = new PokerGame(
      tableId,
      table.players,
      table.smallBlind,
      table.bigBlind
    );
    
    this.activeGames.set(tableId, game);
    
    // Start the first hand
    game.startNewHand();
    
    return true;
  }

  // Handle player action in game
  static playerAction(tableId, playerId, action, amount = 0) {
    const game = this.activeGames.get(tableId);
    if (!game) {
      return { success: false, error: 'No active game found' };
    }
    
    try {
      const result = game.playerAction(playerId, action, amount);
      
      // Update table with latest game state
      const table = this.activeTables.get(tableId);
      if (table) {
        const gameState = game.getGameState();
        table.currentPot = gameState.pot;
        table.communityCards = gameState.communityCards;
        table.gamePhase = gameState.gamePhase;
        table.currentPlayer = gameState.currentPlayer;
        table.lastActivity = new Date();
        
        // Update player chips in table
        table.players.forEach(tablePlayer => {
          const gamePlayer = gameState.players.find(gp => gp.id === tablePlayer.id);
          if (gamePlayer) {
            tablePlayer.chips = gamePlayer.chips;
          }
        });
        
        // Check if game ended and start new hand
        if (gameState.gamePhase === 'finished') {
          setTimeout(() => {
            if (table.players.filter(p => p.chips > 0).length >= 2) {
              game.startNewHand();
            } else {
              table.status = 'waiting';
              this.activeGames.delete(tableId);
            }
          }, 5000); // 5 second delay before next hand
        }
      }
      
      return result;
    } catch (error) {
      console.error('Player action error:', error);
      return { success: false, error: error.message };
    }
  }

  // Leave table
// FIXED tableService.js - leaveTable method

  static leaveTable(tableId, userId) {
    const table = this.activeTables.get(tableId);
    if (!table) return false;
    
    // Convert userId to string for consistent comparison
    const userIdStr = String(userId);
    
    console.log('=== LEAVE TABLE DEBUG ===');
    console.log('User leaving:', userIdStr);
    console.log('Before removal:');
    console.log('Table players:', table.players.map(p => ({ id: p.id, username: p.username, position: p.position })));
    
    // Find the player
    const playerIndex = table.players.findIndex(p => String(p.id) === userIdStr);
    
    if (playerIndex !== -1) {
      const player = table.players[playerIndex];
      console.log(`Player ${player.username} (ID: ${userIdStr}, Position: ${player.position}) leaving table ${table.name}`);
      
      // Get active game if it exists
      const game = this.activeGames.get(tableId);
      
      // CRITICAL FIX: Remove from game engine FIRST, before touching table.players
      if (game && table.status === 'active') {
        console.log(`Removing player ${player.username} from active game engine`);
        
        try {
          // Remove player from game engine BEFORE removing from table
          game.removePlayer(userIdStr);
        } catch (error) {
          console.error('Error removing player from game engine:', error);
        }
      }
      
      // NOW remove player from table.players array
      // This preserves the positions of remaining players
      table.players.splice(playerIndex, 1);
      
      console.log('After removal:');
      console.log('Table players:', table.players.map(p => ({ id: p.id, username: p.username, position: p.position })));
      console.log('========================');
      
      // Check if we still have enough players for the game
      if (table.players.length < 2 && table.status === 'active') {
        console.log(`Not enough players remaining (${table.players.length}), ending game`);
        table.status = 'waiting';
        this.activeGames.delete(tableId);
      } else if (game && table.players.length >= 2) {
        // Game continues with remaining players
        console.log(`Game continues with ${table.players.length} players`);
      }
    }
    
    // Remove from spectators
    const spectatorIndex = table.spectators.findIndex(s => String(s.id) === userIdStr);
    if (spectatorIndex !== -1) {
      const spectator = table.spectators[spectatorIndex];
      console.log(`Spectator ${spectator.username} (ID: ${userIdStr}) leaving table ${table.name}`);
      table.spectators.splice(spectatorIndex, 1);
    }
    
    table.lastActivity = new Date();
    
    console.log(`User ${userIdStr} successfully left table ${tableId}`);
    console.log(`Table now has ${table.players.length} players and ${table.spectators.length} spectators`);
    
    return true;
  }
  // Create duplicate table when one fills up
  static createDuplicateTable(templateId) {
    const template = this.TABLE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;
    
    const newTable = this.createTableFromTemplate(template);
    this.activeTables.set(newTable.id, newTable);
    
    console.log(`Created duplicate table: ${template.name} (${newTable.id})`);
    return newTable;
  }

  // Get table templates
  static getTableTemplates() {
    return this.TABLE_TEMPLATES;
  }

  // Clean up inactive tables
  static cleanupInactiveTables() {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    let cleanedUp = 0;
    
    // Convert to array to avoid iteration issues
    const entries = Array.from(this.activeTables.entries());
    
    for (const [tableId, table] of entries) {
      if (table.players.length === 0 && table.lastActivity < cutoffTime) {
        this.activeTables.delete(tableId);
        this.activeGames.delete(tableId);
        cleanedUp++;
      }
    }
    
    if (cleanedUp > 0) {
      console.log(`Cleaned up ${cleanedUp} inactive tables`);
    }
    
    // Ensure we always have at least one table of each template
    this.TABLE_TEMPLATES.forEach(template => {
      const hasActiveTable = Array.from(this.activeTables.values())
        .some(table => table.templateId === template.id);
      
      if (!hasActiveTable) {
        const newTable = this.createTableFromTemplate(template);
        this.activeTables.set(newTable.id, newTable);
        console.log(`Recreated missing table: ${template.name}`);
      }
    });
  }

  // Get game state for a specific table
  static getGameState(tableId) {
    const game = this.activeGames.get(tableId);
    return game ? game.getGameState() : null;
  }
}

// Initialize tables when service loads
console.log('🔧 DEBUG: About to initialize tables');
TableService.initializeTables();
console.log('🔧 DEBUG: Tables initialized');

module.exports = TableService;