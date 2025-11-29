const pool = require('../config/database');

class HandHistory {
  // Save a complete hand to the database
  static async saveHand(handLog) {
    console.log('💾 ========== SAVING HAND TO DATABASE ==========');
    console.log('📦 Full handLog:', JSON.stringify(handLog, null, 2));
    console.log('👥 Ending stacks with cards:');
    handLog.endingStacks.forEach(player => {
      console.log(`  - ${player.username}: cards = ${JSON.stringify(player.cards)}`);
    });
    console.log('===============================================');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Calculate max pot from actions (the final pot size)
      const maxPot = Math.max(...handLog.actions.map(a => a.pot || 0));
      
      // 1. Insert the hand record WITHOUT ended_at first
      const handResult = await client.query(
        `INSERT INTO poker_hands (
          hand_id, table_id, dealer_position, small_blind, big_blind,
          pot_size, board_flop, board_turn, board_river,
          hand_duration, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          handLog.handId,
          handLog.tableId,
          handLog.dealerPosition,
          handLog.smallBlind,
          handLog.bigBlind,
          maxPot,
          handLog.boardCards.flop ? JSON.stringify(handLog.boardCards.flop) : null,
          handLog.boardCards.turn || null,
          handLog.boardCards.river || null,
          handLog.duration,
          new Date(handLog.timestamp)
        ]
      );
      
      const dbHandId = handResult.rows[0].id;
      
      // 2. Insert players who participated
      // 2. Insert players who participated
      for (const player of handLog.endingStacks) {
        const startingStack = handLog.startingStacks.find(p => p.id === player.id);
        const isWinner = player.profit > 0;
        
        const foldAction = handLog.actions.find(
          a => a.player === player.username && a.action === 'fold'
        );
        const foldedAt = foldAction ? foldAction.phase : null;
        
        // ✅ Get cards - handle both array and missing data
        const playerCards = player.cards && player.cards.length > 0 
          ? JSON.stringify(player.cards) 
          : null;
        
        console.log(`💾 Saving player ${player.username} with cards:`, playerCards);
        
        await client.query(
          `INSERT INTO hand_players (
            hand_id, user_id, username, position,
            starting_chips, ending_chips, profit,
            is_winner, folded_at, cards, final_hand_rank
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,  // ✅ 11 parameters
          [
            dbHandId,                          // $1
            parseInt(player.id),               // $2
            player.username,                   // $3
            startingStack.position,            // $4
            startingStack.chips,               // $5
            player.chips,                      // $6
            player.profit,                     // $7
            isWinner,                          // $8
            foldedAt,                          // $9
            playerCards,                       // $10
            player.finalHandRank || null      // $11 ✅ MAKE SURE THIS IS HERE
          ]
        );
      }
      
      // 3. Insert all actions
      let actionOrder = 0;
      for (const action of handLog.actions) {
        let amount = null;
        const amountMatch = action.action.match(/\$(\d+)/);
        if (amountMatch) {
          amount = parseInt(amountMatch[1]);
        }
        
        await client.query(
          `INSERT INTO hand_actions (
            hand_id, player_username, action_type, amount,
            pot_after, current_bet, phase, action_order, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            dbHandId,
            action.player === 'game' ? null : action.player,
            action.action,
            amount,
            action.pot,
            action.currentBet,
            action.phase,
            actionOrder++,
            new Date(action.timestamp)
          ]
        );
      }
      
      // 4. NOW update ended_at to trigger the statistics update
      await client.query(
        `UPDATE poker_hands SET ended_at = $1 WHERE id = $2`,
        [new Date(), dbHandId]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Hand ${handLog.handId} saved to database (ID: ${dbHandId})`);
      console.log(`📊 User statistics should now be updated!`);
      return dbHandId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error saving hand to database:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get hand history for a specific user
  static async getUserHandHistory(userId, limit = 20) {
    const result = await pool.query(
      `SELECT 
        ph.id,
        ph.hand_id,
        ph.table_id,
        ph.pot_size,
        ph.started_at,
        ph.ended_at,
        ph.board_flop,
        ph.board_turn,
        ph.board_river,
        ph.small_blind,
        ph.big_blind,
        hp.position,
        hp.starting_chips,
        hp.ending_chips,
        hp.profit,
        hp.is_winner,
        hp.folded_at,
        hp.cards as hole_cards,  -- ✅ ADD THIS LINE
        hp.final_hand_rank,       -- ✅ ADD THIS LINE
        (SELECT jsonb_agg(
          jsonb_build_object(
            'username', hp2.username,
            'user_id', hp2.user_id,
            'position', hp2.position,
            'starting_chips', hp2.starting_chips,
            'ending_chips', hp2.ending_chips,
            'profit', hp2.profit,
            'is_winner', hp2.is_winner,
            'folded_at', hp2.folded_at,
            'cards', hp2.cards,  -- ✅ ADD THIS LINE
            'final_hand_rank', hp2.final_hand_rank  -- ✅ ADD THIS LINE
          ) ORDER BY hp2.position
        ) FROM hand_players hp2 WHERE hp2.hand_id = ph.id) as all_players,
        (SELECT jsonb_agg(
          jsonb_build_object(
            'player', ha.player_username,
            'action', ha.action_type,
            'amount', ha.amount,
            'pot', ha.pot_after,
            'phase', ha.phase,
            'timestamp', ha.timestamp
          ) ORDER BY ha.action_order
        ) FROM hand_actions ha WHERE ha.hand_id = ph.id) as actions
      FROM poker_hands ph
      JOIN hand_players hp ON ph.id = hp.hand_id
      WHERE hp.user_id = $1
      ORDER BY ph.started_at DESC
      LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }
  
  // Get detailed hand information including all actions
  static async getHandDetails(handId) {
    const client = await pool.connect();
    
    try {
      // Get hand info
      const handResult = await client.query(
        `SELECT * FROM poker_hands WHERE id = $1`,
        [handId]
      );
      
      if (handResult.rows.length === 0) {
        return null;
      }
      
      const hand = handResult.rows[0];
      
      // Get players
      const playersResult = await client.query(
        `SELECT * FROM hand_players WHERE hand_id = $1 ORDER BY position`,
        [handId]
      );
      
      // Get actions
      const actionsResult = await client.query(
        `SELECT * FROM hand_actions WHERE hand_id = $1 ORDER BY action_order`,
        [handId]
      );
      
      return {
        ...hand,
        players: playersResult.rows,
        actions: actionsResult.rows
      };
      
    } finally {
      client.release();
    }
  }
  
  // Get statistics for a table
  static async getTableStatistics(tableId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_hands,
        AVG(pot_size) as avg_pot,
        MAX(pot_size) as biggest_pot,
        AVG(hand_duration) as avg_duration
      FROM poker_hands
      WHERE table_id = $1`,
      [tableId]
    );
    
    return result.rows[0];
  }
}

module.exports = HandHistory;