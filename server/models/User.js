const pool = require('../config/database');

class User {
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findByIdWithStats(id) {
    // Query without biggest_pot column
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.created_at,
        COALESCE(us.games_played, 0) as games_played,
        COALESCE(us.hands_played, 0) as hands_played,
        COALESCE(us.hands_won, 0) as hands_won,
        COALESCE(us.total_winnings, 0) as total_winnings,
        COALESCE(us.win_rate, 0) as win_rate,
        COALESCE(us.avg_pot_won, 0) as avg_pot_won,
        us.last_played
      FROM users u
      LEFT JOIN user_statistics us ON u.id = us.user_id
      WHERE u.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  static async create({ username, email, passwordHash }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (username, email, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, username, email, created_at',
        [username, email, passwordHash]
      );
      
      const user = userResult.rows[0];
      
      // Initialize user_statistics record for new user
      await client.query(
        `INSERT INTO user_statistics (user_id) VALUES ($1)`,
        [user.id]
      );
      
      await client.query('COMMIT');
      return user;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateProfile(id, { username, email }) {
    console.log('Updating profile for user ID:', id);
    console.log('Update data:', { username, email });
    
    try {
      const result = await pool.query(
        'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email, created_at',
        [username, email, id]
      );
      
      console.log('Update query result:', result.rows[0]);
      
      if (result.rows.length === 0) {
        console.log('No rows updated - user not found');
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  static async emailExists(email, excludeUserId = null) {
    let query = 'SELECT id FROM users WHERE email = $1';
    let params = [email];
    
    if (excludeUserId) {
      query += ' AND id != $2';
      params.push(excludeUserId);
    }
    
    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  static async usernameExists(username, excludeUserId = null) {
    let query = 'SELECT id FROM users WHERE username = $1';
    let params = [username];
    
    if (excludeUserId) {
      query += ' AND id != $2';
      params.push(excludeUserId);
    }
    
    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }

  static async getRecentGames(userId, limit = 10) {
    // Get recent hands from hand_players joined with poker_hands
    const result = await pool.query(
      `SELECT 
        ph.id,
        ph.hand_id,
        ph.table_id,
        ph.pot_size,
        ph.started_at,
        ph.ended_at,
        hp.profit,
        hp.is_winner
      FROM poker_hands ph
      JOIN hand_players hp ON ph.id = hp.hand_id
      WHERE hp.user_id = $1
      ORDER BY ph.started_at DESC
      LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }

  // Helper method to refresh statistics (if needed manually)
  static async refreshStatistics(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get stats from hand_players
      const statsResult = await client.query(
        `SELECT 
          COUNT(DISTINCT hp.hand_id) as hands_played,
          COUNT(DISTINCT ph.table_id) as games_played,
          SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END) as hands_won,
          SUM(hp.profit) as total_winnings,
          MAX(CASE WHEN hp.is_winner THEN ph.pot_size ELSE 0 END) as biggest_pot,
          CASE 
            WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100), 2)
            ELSE 0 
          END as win_rate,
          CASE 
            WHEN SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END) > 0 
            THEN ROUND(SUM(CASE WHEN hp.is_winner THEN hp.profit ELSE 0 END)::numeric / SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END)::numeric, 2)
            ELSE 0 
          END as avg_pot_won,
          MAX(ph.ended_at) as last_played
        FROM hand_players hp
        JOIN poker_hands ph ON hp.hand_id = ph.id
        WHERE hp.user_id = $1 AND ph.ended_at IS NOT NULL`,
        [userId]
      );
      
      const stats = statsResult.rows[0];
      
      // Upsert into user_statistics
      await client.query(
        `INSERT INTO user_statistics (
          user_id, hands_played, games_played, hands_won, 
          total_winnings, biggest_pot, win_rate, avg_pot_won, last_played
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          hands_played = EXCLUDED.hands_played,
          games_played = EXCLUDED.games_played,
          hands_won = EXCLUDED.hands_won,
          total_winnings = EXCLUDED.total_winnings,
          biggest_pot = EXCLUDED.biggest_pot,
          win_rate = EXCLUDED.win_rate,
          avg_pot_won = EXCLUDED.avg_pot_won,
          last_played = EXCLUDED.last_played,
          updated_at = NOW()`,
        [
          userId,
          stats.hands_played || 0,
          stats.games_played || 0,
          stats.hands_won || 0,
          stats.total_winnings || 0,
          stats.biggest_pot || 0,
          stats.win_rate || 0,
          stats.avg_pot_won || 0,
          stats.last_played
        ]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Statistics refreshed for user ${userId}`);
      return stats;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error refreshing statistics:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = User;