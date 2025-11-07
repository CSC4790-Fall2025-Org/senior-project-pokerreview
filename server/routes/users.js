const express = require('express');
const UserController = require('../controllers/userController');
const { body, validationResult } = require('express-validator');

// Import auth middleware
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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
router.use(authenticateToken);

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

module.exports = router;