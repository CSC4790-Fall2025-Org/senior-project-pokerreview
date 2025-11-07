// server/routes/tables.js - FIXED VERSION
console.log('🔧 DEBUG: Loading tables.js routes file');

const express = require('express');
const TableController = require('../controllers/tableController');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

console.log('🔧 DEBUG: TableController loaded:', typeof TableController);
console.log('🔧 DEBUG: TableController.getTables:', typeof TableController.getTables);

const router = express.Router();

// Validation middleware
const validateJoinAsPlayer = [
  body('buyInAmount')
    .isNumeric()
    .withMessage('Buy-in amount must be a number')
    .custom((value) => {
      if (value <= 0) {
        throw new Error('Buy-in amount must be greater than 0');
      }
      return true;
    }),
];

const validatePlayerAction = [
  body('action')
    .isIn(['fold', 'call', 'bet', 'raise', 'check', 'all-in']) // FIXED: Added 'bet'!
    .withMessage('Invalid action'),
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value, { req }) => {
      if ((req.body.action === 'raise' || req.body.action === 'bet') && (!value || value <= 0)) {
        throw new Error('Bet/Raise amount must be greater than 0');
      }
      return true;
    }),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg
    });
  }
  next();
};

// Get hand history for a table 
// putthing this above auth token for now just cause i dont wanna deal with authentication
// router.get('/:tableId/hand-history', TableController.getHandHistory);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// IMPORTANT: Put specific routes BEFORE parameterized routes
// Get table templates - must come before /:tableId
router.get('/templates/all', TableController.getTableTemplates);

// Get all active tables
router.get('/', TableController.getTables);

// Get specific table details - this should come AFTER specific routes
router.get('/:tableId', TableController.getTable);

// Get game state for a table
router.get('/:tableId/game-state', TableController.getGameState);


// Join table as spectator
router.post('/:tableId/spectate', TableController.joinAsSpectator);

// Join table as player
router.post('/:tableId/join', validateJoinAsPlayer, handleValidationErrors, TableController.joinAsPlayer);

// Player game action (fold, call, raise, check, all-in)
router.post('/:tableId/action', validatePlayerAction, handleValidationErrors, TableController.playerAction);

// Leave table
router.post('/:tableId/leave', TableController.leaveTable);

console.log('🔧 DEBUG: Tables router created and routes defined');
module.exports = router;