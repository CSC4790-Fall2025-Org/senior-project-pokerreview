// server/controllers/userController.js
const User = require('../models/User');

class UserController {
  static async getProfile(req, res) {
    console.log('=== UserController.getProfile called ===');
    console.log('req.user:', req.user);
    console.log('req.user type:', typeof req.user);
    
    if (!req.user) {
      console.error('ERROR: req.user is undefined - auth middleware not working');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('req.user.userId:', req.user.userId);
    
    try {
      // ✅ FIXED: Use findByIdWithStats to get user + statistics
      console.log('Attempting to find user with stats by ID:', req.user.userId);
      const userWithStats = await User.findByIdWithStats(req.user.userId);
      
      if (!userWithStats) {
        console.log('User not found in database');
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      console.log('User with stats found:', userWithStats);
      
      // Return user with real statistics from database
      res.json({
        success: true,
        user: userWithStats
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateProfile(req, res) {
    console.log('=== UserController.updateProfile called ===');
    console.log('req.user:', req.user);
    console.log('req.body:', req.body);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    try {
      const { username, email, avatar_url } = req.body;
      const userId = req.user.userId;

      // Check if email is being changed and already exists
      if (email && email !== req.user.email) {
        const emailExists = await User.emailExists(email, userId);
        if (emailExists) {
          return res.status(400).json({
            success: false,
            error: 'Email already exists'
          });
        }
      }

      // Check if username is being changed and already exists  
      if (username && username !== req.user.username) {
        const usernameExists = await User.usernameExists(username, userId);
        if (usernameExists) {
          return res.status(400).json({
            success: false,
            error: 'Username already exists'
          });
        }
      }

      // Update the profile
      console.log('Updating profile for user:', userId);
      const updatedUser = await User.updateProfile(userId, {
        username: username || req.user.username,
        email: email || req.user.email,
        avatar_url
      });

      console.log('Profile updated successfully:', updatedUser);

      // ✅ FIXED: After updating, fetch user with stats
      const userWithStats = await User.findByIdWithStats(userId);

      res.json({
        success: true,
        user: userWithStats,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getRecentGames(req, res) {
    console.log('=== UserController.getRecentGames called ===');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 10;

      // ✅ FIXED: Use the getRecentGames method from User model
      const recentGames = await User.getRecentGames(userId, limit);

      res.json({
        success: true,
        games: recentGames
      });
    } catch (error) {
      console.error('Get recent games error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // ✅ NEW: Manual refresh endpoint for debugging/testing
  static async refreshStats(req, res) {
    console.log('=== UserController.refreshStats called ===');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    try {
      const userId = req.user.userId;
      
      console.log('Manually refreshing stats for user:', userId);
      
      // Refresh statistics from hand history
      await User.refreshStatistics(userId);
      
      // Get updated user with stats
      const userWithStats = await User.findByIdWithStats(userId);
      
      res.json({
        success: true,
        user: userWithStats,
        message: 'Statistics refreshed successfully'
      });
    } catch (error) {
      console.error('Refresh stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh statistics'
      });
    }
  }
}

module.exports = UserController;