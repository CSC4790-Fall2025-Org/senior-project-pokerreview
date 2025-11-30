// src/services/api/user.ts

const express = require('express');
const UserController = require('../controllers/userController');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Import necessary modules for file upload and processing
const multer = require('multer');   // NEW: Middleware for handling multipart/form-data
const sharp = require('sharp');     // NEW: Image processing/optimization library
const path = require('path');       // NEW: Utility for path handling

// Import auth middleware
const { authenticateToken } = require('../middleware/auth'); // Correct imported name

const router = express.Router();

// Setup Multer for memory storage (files stored in a Buffer before processing)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Validation middleware for profile updates
const validateProfileUpdate = [
  body('username').optional().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('avatar_url').optional().isURL(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg
    });
  }
  next();
};

// Apply authentication middleware to all routes
// All routes defined below this line are protected by authenticateToken
router.use(authenticateToken);

// ===============================================
// NEW ROUTE: Upload and Update Avatar
// ===============================================
// FIX: Removed the undefined 'isAuthenticated' middleware.
router.post('/profile/avatar', upload.single('avatar'), async (req, res) => {
    
    // IMPORTANT: You still need to implement the Sharp processing logic here.
    // Assuming 'req.file' contains the file buffer.
    
    try {
        const userId = req.user.userId;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        const fileName = `avatar-${userId}-${Date.now()}.webp`; // Force webp for optimization
        const uploadDir = path.join(__dirname, '..', 'uploads');
        
        // Ensure the uploads directory exists (critical for the previous error!)
        const fs = require('fs/promises');
        await fs.mkdir(uploadDir, { recursive: true });

        // Process and save the image using sharp
        const finalUploadPath = path.join(uploadDir, fileName);
        await sharp(req.file.buffer)
          .resize(128, 128) // Resize to a standard avatar size
          .webp({ quality: 80 }) // Convert to webp
          .toFile(finalUploadPath);

        const finalAvatarPath = `/uploads/${fileName}`; 

        // 💡 Call the updated model method that saves the URL and returns the complete user profile
        const updatedUser = await User.updateAvatarUrl(userId, finalAvatarPath);

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: 'User not found after update.' });
        }
        
        // Return the complete updatedUser object with all stats
        return res.json({ 
            success: true, 
            user: updatedUser 
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to process and save avatar.' });
    }
});
// ===============================================

// Get current user profile with statistics
router.get('/profile', UserController.getProfile);

// Update user profile
router.put('/profile', validateProfileUpdate, handleValidationErrors, UserController.updateProfile);

// Get user's recent games
router.get('/recent-games', UserController.getRecentGames);

// Get user's hand history (all tables)
router.get('/hand-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const HandHistory = require('../models/HandHistory');
    const hands = await HandHistory.getUserHandHistory(req.user.userId, limit);
    
    res.json({
      success: true,
      hands
    });
  } catch (error) {
    console.error('Get user hand history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hand history'
    });
  }
});

// Get user stats (NEW ROUTE)
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user with stats
    const userWithStats = await User.findByIdWithStats(userId);
    
    if (!userWithStats) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Format stats for frontend
    const stats = {
      bankroll: 10000, // TODO: Add bankroll to user table or calculate from total_winnings
      gamesPlayed: parseInt(userWithStats.games_played) || 0,
      handsPlayed: parseInt(userWithStats.hands_played) || 0,
      handsWon: parseInt(userWithStats.hands_won) || 0,
      totalWinnings: parseFloat(userWithStats.total_winnings) || 0,
      winRate: parseFloat(userWithStats.win_rate) || 0,
      avgPotWon: parseFloat(userWithStats.avg_pot_won) || 0,
      biggestPot: parseFloat(userWithStats.biggest_pot) || 0,
      lastPlayed: userWithStats.last_played
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
    });
  }
});

module.exports = router;