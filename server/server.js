// server/server.js - NO RATE LIMITING VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tableRoutes = require('./routes/tables');
const aiRoutes = require('./routes/ai');


if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not defined in environment variables!');
  process.exit(1);
}
console.log('✅ JWT_SECRET loaded successfully');

const app = express();
const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store client subscriptions
const tableSubscriptions = new Map(); // tableId -> Set of ws clients


wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection established');
  console.log('📊 Total connections:', wss.clients.size);
  let userId = null;
  let subscribedTables = new Set();
  
  ws.on('message', (message) => {
    try {
      const { type, data } = JSON.parse(message);
      
      switch (type) {
        case 'authenticate':
          try {
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
            userId = decoded.userId;
            ws.userId = userId; // ✅ ADD THIS LINE
            console.log('✅ User authenticated via WebSocket:', userId);
            ws.send(JSON.stringify({ type: 'authenticated', data: { userId } }));
          } catch (error) {
            console.error('❌ WebSocket auth failed:', error.message);
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Authentication failed' } }));
          }
          break;
          
          case 'subscribe':
            console.log('📍 Subscribe request received');
            if (!userId) {
              console.log('❌ Subscribe failed - not authenticated');
              ws.send(JSON.stringify({ type: 'error', data: { message: 'Not authenticated' } }));
              return;
            }
            const { tableId } = data;
            console.log('✅ User', userId, 'subscribing to table', tableId);
            subscribedTables.add(tableId);
            
            if (!tableSubscriptions.has(tableId)) {
              tableSubscriptions.set(tableId, new Set());
            }
            tableSubscriptions.get(tableId).add(ws);
            
            console.log(`✅ User ${userId} subscribed to table ${tableId}`);
            // ✅ Send confirmation back to client
            ws.send(JSON.stringify({ 
              type: 'subscribed', 
              data: { tableId, success: true } 
            }));
            break;
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    // Clean up subscriptions
    subscribedTables.forEach(tableId => {
      tableSubscriptions.get(tableId)?.delete(ws);
    });
    console.log('WebSocket disconnected');
  });
});
// Broadcast function for table updates
global.broadcastTableUpdate = (tableId, data) => {
  const subscribers = tableSubscriptions.get(tableId);
  if (subscribers) {
    subscribers.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Calculate userRole for this specific client
        const isPlayer = data.players?.some(p => String(p.id) === String(client.userId));
        const isSpectator = data.spectators?.some(s => String(s.id) === String(client.userId));
        const userRole = isPlayer ? 'player' : isSpectator ? 'spectator' : 'observer';
        
        const message = JSON.stringify({ 
          type: 'table_update', 
          data: {
            ...data,
            userRole,
            spectatorList: data.spectators || []
          }
        });
        client.send(message);
      }
    });
  }
};


app.set('trust proxy', 1); // behind Nginx/ALB

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-frontend.vercel.app'
    : 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.join(__dirname, 'uploads'); 
app.use('/uploads', express.static(uploadsPath));

app.use((req,res,next)=>{ console.log('[REQ]', req.method, req.url); next(); });

app.use('/api/ai', aiRoutes);


// DEBUG: Log all requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
console.log('Auth routes registered');
app.use('/api/users', userRoutes);
console.log('User routes registered');
app.use('/api/tables', tableRoutes);
console.log('Table routes registered');
app.use('/api/ai', aiRoutes); 
console.log('AI routes registered');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ Serve React build in production (single-port app)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../build');
  app.use(express.static(buildPath));

  // Send React for any GET that isn't /api/*
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });

} else {
  // Dev root
  app.get('/', (req, res) => {
    res.json({ message: 'Poker Platform API', version: '1.0.0', status: 'running' });
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success:false, error: err.message, stack: err.stack });
});


// 404 handler - must be last
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
});

const PORT = process.env.PORT || 3001;

// ✅ Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('WebSocket server is running');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`CORS enabled for: http://localhost:3000`);
  }
  
  const TableService = require('./services/tableService');
  const tables = TableService.getActiveTables();
  console.log(`TableService is working: ${tables.length} tables available`);
});