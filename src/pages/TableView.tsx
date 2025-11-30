// src/pages/TableView.tsx - FINAL VERSION WITH FIXED CARD ANIMATIONS
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { TableService, TableData, TablePlayer } from '../services/api/table';
import { Button } from '../components/common/Button';
import { motion } from 'framer-motion';
import { wsService } from '../services/websocket';

interface ExtendedTablePlayer extends TablePlayer {
  avatar_url?: string | null;
  isDealer?: boolean;      
  isSmallBlind?: boolean;  
  isBigBlind?: boolean;    
}
interface ExtendedTableData extends TableData {
  players: ExtendedTablePlayer[];
}

interface JoinAsPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (amount: number) => void;
  minBuyIn: number;
  maxBuyIn: number;
  isLoading: boolean;
}

const deckPosition = { x: 50, y: 50 }; // center of table in percentage


const JoinAsPlayerModal: React.FC<JoinAsPlayerModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  minBuyIn,
  maxBuyIn,
  isLoading
}) => {
  const [buyInAmount, setBuyInAmount] = useState(minBuyIn);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (buyInAmount < minBuyIn || buyInAmount > maxBuyIn) {
      setError(`Buy-in must be between $${minBuyIn.toLocaleString()} and $${maxBuyIn.toLocaleString()}`);
      return;
    }

    onJoin(buyInAmount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Join as Player</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buy-in Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                min={minBuyIn}
                max={maxBuyIn}
                step="50"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-poker-gold"
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Range: {formatCurrency(minBuyIn)} - {formatCurrency(maxBuyIn)}
            </p>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <Button 
              type="submit" 
              isLoading={isLoading} 
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </Button>
            <Button 
              type="button"
              variant="secondary" 
              onClick={onClose} 
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TableView: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [table, setTable] = useState<ExtendedTableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [holeCardsDealt, setHoleCardsDealt] = useState(false);
  const [animatedCards, setAnimatedCards] = useState<Array<{playerId: string, card: string, index: number}>>([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [playersInCurrentHand, setPlayersInCurrentHand] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);

  const [lastActionPlayerId, setLastActionPlayerId] = useState<string | null>(null);
  const [waitingForStateUpdate, setWaitingForStateUpdate] = useState(false);
  

  const seenEventsRef = useRef(new Set<string>());

  // Helper function to get card final position (matching exactly where static cards were)
    // First, find this section in getCardPosition function (around line 28-35):
  const getCardPosition = (playerPosition: number, cardIndex: number, maxPlayers: number) => {
    const { x: playerX, y: playerY } = getPlayerPosition(playerPosition, maxPlayers);
    
    const player = table?.players.find(p => p.position === playerPosition);
    const isCurrentUser = player?.id === user?.id;
    
    // Cards will be positioned INSIDE the player container box
    const cardWidth = 40; // Increased from 30
    const cardSpacing = 4;
    
    // For animated cards during dealing
    const horizontalOffset = isCurrentUser ? 80 : 80; // Offset from center
    const cardOffsetX = horizontalOffset + (cardIndex * (cardWidth + cardSpacing));
    const cardOffsetY = 0;
    
    return {
      x: playerX,
      y: playerY + cardOffsetY,
      offsetX: cardOffsetX
    };
  };

  useEffect(() => {
    // Only deal cards if:
    // 1. Table exists
    // 2. Game phase is preflop
    // 3. Cards haven't been dealt yet
    // 4. There are at least 2 players (game can actually start)
    if (!table || !table.players || table.gamePhase !== 'preflop' || holeCardsDealt || table.players.length < 2) {
      return;
    }

    // Reset animation state when new game starts
    setAnimatedCards([]);
    setAnimationComplete(false);

    const cardsToDeal: Array<{playerId: string, card: string, index: number}> = [];
    
    // Deal cards in proper order - first card to each player, then second card
    for (let cardIndex = 0; cardIndex < 2; cardIndex++) {
      table.players.forEach((player) => {
        // ✅ FIXED: Only deal to players who have cards AND are not sitting out
        if (player.cards && 
            player.cards.length > 0 && 
            !(player as any).isSittingOut) {
          const cardValue = player.cards[cardIndex] || 'card_back';
          cardsToDeal.push({ playerId: player.id, card: cardValue, index: cardIndex });
        }
      });
    }

    // Track which players are being dealt cards (they're in the current hand)
    const currentHandPlayers = new Set(cardsToDeal.map(deal => deal.playerId));
    setPlayersInCurrentHand(currentHandPlayers);
    
    console.log('Players in current hand:', Array.from(currentHandPlayers));
    console.log('Cards to deal:', cardsToDeal.length);
    console.log('Players sitting out:', table.players.filter((p: any) => p.isSittingOut).map((p: any) => p.username));

    cardsToDeal.forEach((deal, i) => {
      setTimeout(() => {
        setAnimatedCards((prev) => [...prev, deal]);
        
        // Mark animation complete after last card
        if (i === cardsToDeal.length - 1) {
          setTimeout(() => {
            setHoleCardsDealt(true);
            setAnimationComplete(true);
          }, 800);
        }
      }, i * 150);
    });
  }, [table, holeCardsDealt]);

  // Reset animation state when game phase changes
  useEffect(() => {
    if (table?.gamePhase !== 'preflop') {
      setHoleCardsDealt(false);
      setAnimatedCards([]);
    }
  }, [table?.gamePhase]);

  //action state
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(20);
  const [gameEvents, setGameEvents] = useState<Array<{
    message: string;
    timestamp: Date;
    type: string;
    cards?: string;
  }>>([]);

  const loadTable = React.useCallback(async () => {
    if (!tableId) return;
    try {
      const response = await TableService.getTable(tableId);
      if (response.success && response.table) {
        setTable(response.table);
        setError(null);
      } else {
        setError(response.error || 'Failed to load table');
      }
    } catch (err) {
      setError('Network error loading table');
      console.error('Error loading table:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);
  
  // Load table data
  useEffect(() => {
    console.log('🔍 TableView mount effect - tableId:', tableId);
    console.log('🔍 Current user:', user);
    if (!tableId) {
      console.log('❌ No tableId, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }

    console.log('✅ tableId check passed, continuing...');

    const token = localStorage.getItem('auth_token');
    console.log('🔑 Token from localStorage:', token ? 'EXISTS' : 'MISSING');
    console.log('🔍 All localStorage keys:', Object.keys(localStorage));
    console.log('🔑 Token from localStorage:', token ? 'EXISTS' : 'MISSING');
    if (!token) {
      console.log('❌ No token, redirecting to login');
      navigate('/login');
      return;
    }
    console.log('✅ Token check passed, about to loadTable...');

    // Initial load
    console.log('📞 About to call loadTable()');
    loadTable().catch(err => {
      console.error('❌ loadTable() failed:', err);
    });
    console.log('✅ loadTable() called, about to setup WebSocket');

    // Connect WebSocket
    console.log('🔌 Attempting WebSocket connection with token:', token ? 'present' : 'MISSING');
    wsService.connect(token);
    console.log('📡 Subscribing to table:', tableId);
    wsService.subscribeToTable(tableId);

    // Listen for table updates
    const handleTableUpdate = (updatedTable: TableData) => {
      console.log('✅ Received table update via WebSocket');
      console.log('📦 Updated table data:', JSON.stringify(updatedTable, null, 2));
      setTable(updatedTable);
      setError(null);
      setIsLoading(false);
    };

    // ✅ ADD: Listen for connection status
    const handleAuthenticated = () => {
      console.log('✅ WebSocket authenticated');
      setWsConnected(true);
    };

    wsService.on('table_update', handleTableUpdate);
    wsService.on('authenticated', handleAuthenticated);

    // Cleanup
    return () => {
      wsService.off('table_update', handleTableUpdate);
      wsService.off('authenticated', handleAuthenticated);
      wsService.unsubscribeFromTable(tableId);
      setWsConnected(false);
    };
  }, [tableId, navigate, loadTable]);
  
  // ✅ FIXED: Track game events directly from gameHistory (single source of truth)
useEffect(() => {
  if (!table?.gameHistory || !Array.isArray(table.gameHistory)) return;
  
  // Convert gameHistory to display events
  const displayEvents = table.gameHistory.map((historyEntry: any) => {
    // Determine event type
    let eventType = 'action';
    if (historyEntry.action.includes('wins')) {
      eventType = 'win';
    } else if (historyEntry.action.includes('fold')) {
      eventType = 'fold';
    } else if (historyEntry.action.includes('raise') || historyEntry.action.includes('bet')) {
      eventType = 'bet';
    } else if (historyEntry.action.includes('begins')) {
      eventType = 'phase';
    }
    
    // Build the message - format properly based on who the player is
    let message = historyEntry.action;
    if (historyEntry.player && historyEntry.player !== 'game') {
      message = `${historyEntry.player} ${historyEntry.action}`;
    } else if (historyEntry.player === 'game') {
      // For game events like "Flop begins", just show the action
      message = historyEntry.action;
    }
    
    return {
      message,
      timestamp: historyEntry.timestamp ? new Date(historyEntry.timestamp) : new Date(),
      type: eventType,
      cards: historyEntry.winningHand ? historyEntry.winningHand.join(' ') : undefined
    };
  });
  
  setGameEvents(displayEvents);
}, [table?.gameHistory]);

// Reset events when new hand starts
useEffect(() => {
  if (table?.gamePhase === 'waiting' && gameEvents.length > 0) {
    const separatorKey = `separator-${Date.now()}`;
    if (!seenEventsRef.current.has(separatorKey)) {
      seenEventsRef.current.clear(); // Clear old keys
      seenEventsRef.current.add(separatorKey);
      
      setGameEvents((prev) => [...prev, {
        message: '━━━━━━ New Hand Starting ━━━━━━',
        timestamp: new Date(),
        type: 'separator'
      }]);
    }
  }
}, [table?.gamePhase, gameEvents.length]);


  const handleJoinAsPlayer = async (buyInAmount: number) => {
    if (!tableId) return;

    setIsJoining(true);
    try {
      const response = await TableService.joinAsPlayer(tableId, buyInAmount);
      if (response.success) {
        setShowJoinModal(false);
        // Do NOT set setTable(null) or setIsLoading(true) here.
        // The server will broadcast the table update via WebSocket.
        // We rely on the WebSocket to update the state and seat the player.
        
        // OPTIONAL: Call loadTable for immediate visual feedback, but it's not strictly necessary 
        // if your WS is working. If you keep it, ensure no errors occur.
        // await loadTable();
        
      } else {
        setError(response.error || 'Failed to join as player');
      }
    } catch (err) {
      setError('Network error joining table');
      console.error('Error joining as player:', err);
    } finally {
      // The WS listener should be responsible for setting isLoading=false 
      // once the 'table_update' is received.
      setIsJoining(false); 
      // If the table still looks wrong, keep the setIsLoading(false) here 
      // as a safety mechanism, but be aware of the race condition.
      // setIsLoading(false); 
    }
  };
  const handleLeaveTable = async () => {
    if (!tableId) return;

    try {
      const response = await TableService.leaveTable(tableId);
      if (response.success) {
        navigate('/dashboard');
      } else {
        setError(response.error || 'Failed to leave table');
      }
    } catch (err) {
      setError('Network error leaving table');
      console.error('Error leaving table:', err);
    }
  };

  // NEW: player action handlers
  const handlePlayerAction = async (action: string, amount?: number) => {
    if (!tableId || !table || !user) return;
    
    setIsActionLoading(true);
    setWaitingForStateUpdate(true);
    setLastActionPlayerId(String(user.id));
    
    try {
      console.log('Making action:', action, amount);
      const response = await TableService.playerAction(tableId, action, amount);
      if (response.success) {
        setError(null);
        // Don't clear isActionLoading - let WebSocket update do it
      } else {
        setError(response.error || `Failed to ${action}`);
        setIsActionLoading(false);
        setWaitingForStateUpdate(false);
        setLastActionPlayerId(null);
      }
    } catch (err) {
      setError(`Network error during ${action}`);
      console.error(`Error during ${action}:`, err);
      setIsActionLoading(false);
      setWaitingForStateUpdate(false);
      setLastActionPlayerId(null);
    }
  };

  useEffect(() => {
    if (waitingForStateUpdate && table && lastActionPlayerId && user) {
      // Clear if turn changed OR if we received a complete state update with a valid currentPlayer
      if (table.currentPlayer && String(table.currentPlayer) !== lastActionPlayerId) {
        console.log('✅ Turn changed, clearing action lock');
        setIsActionLoading(false);
        setWaitingForStateUpdate(false);
        setLastActionPlayerId(null);
      } else if (table.gamePhase && table.currentPlayer) {
        // Safety: Clear after 2 seconds if we got a valid state but turn didn't change
        setTimeout(() => {
          if (waitingForStateUpdate) {
            console.log('⏱️ Timeout clearing action lock');
            setIsActionLoading(false);
            setWaitingForStateUpdate(false);
            setLastActionPlayerId(null);
          }
        }, 2000);
      }
    }
  }, [table?.currentPlayer, table?.gamePhase, waitingForStateUpdate, lastActionPlayerId, user]);


  const handleFold = () => handlePlayerAction('fold');
  const handleCheck = () => handlePlayerAction('check');
  const handleCall = () => handlePlayerAction('call');
  const handleAllIn = () => handlePlayerAction('all-in');
  const handleBet = async (amount: number) => {
    setShowRaiseModal(false);
    await handlePlayerAction('bet', amount);
  };
  const handleRaise = async (amount: number) => {
    setShowRaiseModal(false);
    await handlePlayerAction('raise', amount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPlayerPosition = (position: number, maxPlayers: number) => {
    // Custom positioning for symmetrical layouts
    const radiusX = 40; // Reduced to keep cards on table
    const radiusY = 31; // Reduced to keep cards on table
    
    let angle: number;
    
    if (maxPlayers === 6) {
      // 6 players: evenly distributed
      angle = (position / maxPlayers) * 360;
    } else if (maxPlayers === 8) {
      // 8 players: evenly distributed
      angle = (position / maxPlayers) * 360;
    } else if (maxPlayers === 9) {
      // 9 players: 1 top, 2 upper sides, 2 middle sides, 2 bottom, 2 lower sides
      // Symmetrical across Y-axis with 2 players at bottom
      const angles = [0, 40, 80, 135, 165, 195, 225, 280, 320];
      angle = angles[position];
    } else {
      // All other tables: evenly distributed with equal spacing
      angle = (position / maxPlayers) * 360;
    }
    
    const x = 50 + radiusX * Math.cos((angle - 90) * Math.PI / 180);
    const y = 50 + radiusY * Math.sin((angle - 90) * Math.PI / 180);
    return { x, y };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-gold"></div>
          <div className="text-white text-xl">Loading table...</div>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Table not found</div>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  console.log('Player properties:', table.players[0]); // Log first player to see all properties

  const isPlayer = table.userRole === 'player';
  const isSpectator = table.userRole === 'spectator';
  const canJoinAsPlayer = !isPlayer && table.players.length < table.maxPlayers;

  console.log('=== TURN DEBUG ===');
  console.log('table.currentPlayer:', table.currentPlayer);
  console.log('user?.id:', user?.id);
  console.log('table.players:', table.players.map(p => ({ id: p.id, username: p.username })));
  console.log('currentPlayerIndex from backend would be player:', table.players.find(p => p.id === table.currentPlayer));
  console.log('isMyTurn calculation:', table.currentPlayer === user?.id);
  console.log('==================');
  console.log('=== FRONTEND TURN DEBUG ===');
  console.log('table:', table);
  console.log('table.currentPlayer:', table.currentPlayer);
  console.log('user:', user);
  console.log('user?.id:', user?.id);
  console.log('table.players:', table.players);
  console.log('table.gamePhase:', table.gamePhase);
  console.log('table.status:', table.status);


  // NEW: turn and betting logic
  const isMyTurn = String(table.currentPlayer) === String(user?.id); // <-- FIX HERE
  const currentPlayer = table.players.find(p => String(p.id) === String(table.currentPlayer));

  console.log('currentPlayer found:', currentPlayer);
  console.log('isMyTurn calculation:', isMyTurn);
  //console.log('myPlayer found:', myPlayer);
  console.log('==============================');
  // Also update the display logic:
  <div className="text-white mb-2">
    {isMyTurn ? (
      <span className="text-green-400 font-bold">Your Turn</span>
    ) : (
      <span className="text-gray-400">
        Waiting for {currentPlayer?.username || 'other player'}
      </span>
    )}
  </div>
  const myPlayer = table.players.find(p => String(p.id) === String(user?.id));
  const currentBet = table.players.reduce((max, p) => Math.max(max, p.currentBet || 0), 0);
  const callAmount = currentBet - (myPlayer?.currentBet || 0);
  const canCheck = callAmount === 0;
  const isFacingBet = currentBet > 0;
  
  // Calculate minimum raise properly using lastRaiseAmount from backend
  const minRaiseIncrement = (table.lastRaiseAmount && table.lastRaiseAmount > 0) 
    ? table.lastRaiseAmount 
    : table.bigBlind;
  const minRaise = currentBet + minRaiseIncrement;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900 border-b-2 border-poker-gold shadow-lg">
        <nav className="flex justify-between items-center max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-poker-gold to-yellow-400 bg-clip-text text-transparent">
              {table.name}
            </div>
            <div className="text-sm text-gray-400 capitalize">
              {table.gameType.replace('-', ' ')} • {table.players.length}/{table.maxPlayers} Players
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isPlayer && (
              <Button
                onClick={handleLeaveTable}
                variant="secondary"
                className="bg-red-600 hover:bg-red-700"
              >
                Leave Table
              </Button>
            )}
          </div>
        </nav>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-200 hover:text-white ml-4"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Area */}
      {/* Main Table Area */}
      <main className="w-full px-6 pt-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Poker Table */}
          <div className="lg:col-span-3">
            {/* Poker Table - REDESIGNED */}
            <div className="relative bg-gray-900 rounded-full aspect-[5/2.8] shadow-2xl overflow-visible mb-6">
              {/* Outer rail */}
              <div className="absolute inset-0 rounded-full border-[16px] border-yellow-700 shadow-inner">
                {/* Inner rail with gradient */}
                <div className="absolute inset-0 rounded-full border-[8px] border-yellow-600 shadow-lg">
                  {/* Felt surface */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-700 via-green-800 to-green-900 shadow-inner">
                    {/* Felt texture overlay */}
                    <div 
                      className="absolute inset-0 rounded-full opacity-20"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 2px,
                          rgba(0,0,0,0.1) 2px,
                          rgba(0,0,0,0.1) 4px
                        )`
                      }}
                    />

                    {/* =========== ENHANCED PLAYER SEATS WITH INTEGRATED CARDS =========== */}
                    {table.players.map((player) => {
                      const { x, y } = getPlayerPosition(player.position, table.maxPlayers);
                      const isMyPlayer = String(player.id) === String(user?.id);
                      const isActive = String(table.currentPlayer) === String(player.id);
                      const avatarUrl = player.avatar_url || null;
                      const hasCards = animationComplete && player.cards && player.cards.length > 0 && 
                                      !(player as any).isFolded && !(player as any).isSittingOut;

                      return (
                        <div
                          key={player.id}
                          style={{ 
                            left: `${x}%`, 
                            top: `${y}%`,
                          }}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                        >
                          <div 
                            className={`flex flex-col items-center p-4 rounded-xl bg-gray-800 shadow-2xl 
                                        border-2 transition-all duration-300 ${
                                          isActive ? 'border-green-400 scale-105 shadow-green-400/50' : 'border-gray-700'
                                        } ${
                                          hasCards ? 'w-80' : 'w-44'
                                        }`}
                          >
                            <div className="flex items-center gap-1 w-full">
                              {/* Avatar - LARGER (16 -> 20) */}
                              <div className="relative flex-shrink-0">
                                {avatarUrl ? (
                                  <img 
                                    src={avatarUrl}
                                    alt={`${player.username}'s profile`} 
                                    className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-lg" 
                                  />
                                ) : (
                                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-poker-gold to-yellow-600 flex items-center justify-center border-3 border-white shadow-lg">
                                    <span className="text-gray-900 font-bold text-2xl">
                                      {player.username.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Dealer/Blind Button */}
                                {(player.isDealer || player.isBigBlind || player.isSmallBlind) && (
                                  <div 
                                    className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center text-gray-900 shadow-md ${
                                      player.isDealer ? 'bg-white' : (player.isBigBlind ? 'bg-red-500' : 'bg-blue-500')
                                    }`}
                                    title={player.isDealer ? 'Dealer' : (player.isBigBlind ? 'Big Blind' : 'Small Blind')}
                                  >
                                    {player.isDealer ? 'D' : (player.isBigBlind ? 'BB' : 'SB')}
                                  </div>
                                )}
                              </div>
                              
                              {/* Name and Stack */}
                              <div className="flex-1 min-w-[100px]">
                                <div className={`text-base font-bold ${isMyPlayer ? 'text-poker-gold' : 'text-white'}`}>
                                  {player.username}
                                </div>
                                <div className="text-sm text-gray-300 font-semibold">
                                  {formatCurrency(player.chips)}
                                </div>
                              </div>
                              
                              {/* Cards - LARGER (12x16 -> 16x22) and V-SHAPED */}
                              {hasCards && player.cards && (
                                  <div className="flex flex-shrink-0 items-center relative" style={{ width: '100px' }}>
                                  {isMyPlayer ? (
                                    // V-shaped cards for current user - OVERLAPPING
                                    player.cards.map((card, index) => (
                                      <div 
                                        key={`card-${index}`} 
                                        className="w-20 h-28 transition-transform hover:scale-110 hover:z-10 absolute"
                                        style={{
                                          left: index === 0 ? '0px' : '50px',
                                          top: '50%',
                                          transform: index === 0 ? 'translateY(-50%) rotate(-10deg)' : 'translateY(-50%) rotate(10deg)',
                                          transformOrigin: 'center center',
                                          zIndex: index === 1 ? 2 : 1
                                        }}
                                      >
                                        <img
                                          src={`/cards/${card}.svg`}
                                          alt={card}
                                          className="w-full h-full object-contain rounded-lg shadow-xl"
                                          onError={(e) => {
                                            console.log('Card failed to load:', card);
                                            e.currentTarget.src = '/cards/card_back.png';
                                          }}
                                        />
                                      </div>
                                    ))
                                  ) : (
                                    // V-shaped face-down cards for other players
                                    Array.from({ length: 2 }).map((_, index) => (
                                      <div 
                                        key={`card-back-${index}`} 
                                        className="w-20 h-28 transition-transform hover:scale-110 hover:z-10 absolute"
                                        style={{
                                          left: index === 0 ? '0px' : '50px',
                                          top: '50%',
                                          transform: index === 0 ? 'translateY(-50%) rotate(-10deg)' : 'translateY(-50%) rotate(10deg)',
                                          transformOrigin: 'center center',
                                          zIndex: index === 1 ? 2 : 1
                                        }}
                                      >
                                        <img
                                          src="/cards/card_back.png"
                                          alt="face-down card"
                                          className="w-full h-full object-contain rounded-lg shadow-xl"
                                        />
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Current Bet Badge */}
                            {(player.currentBet ?? 0) > 0 && (
                              <div className="absolute -top-9 bg-gradient-to-r from-yellow-600 to-yellow-500 text-gray-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                {formatCurrency(player.currentBet ?? 0)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* ========= END ENHANCED PLAYER SEATS ========= */}

                    {/* Community Cards Area */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="text-center mb-2">
                        {table.currentPot > 0 && (
                          <div className="text-poker-gold font-bold text-xl mb-1 drop-shadow-lg">
                            Pot: {formatCurrency(table.currentPot)}
                          </div>
                        )}
                        <div className="text-white font-semibold text-sm capitalize drop-shadow-md">
                          {table.gamePhase}
                        </div>
                      </div>
                      
                      {/* Community Cards */}
                      <div className="flex justify-center space-x-2">
                        {table.communityCards && table.communityCards.length > 0 ? (
                          table.communityCards.map((card, index) => (
                            <img
                              key={index}
                              src={`/cards/${card}.svg`}
                              alt={card}
                              className="w-12 h-16 rounded border-2 border-gray-300 shadow-lg"
                            />
                          ))
                        ) : null}

                        {Array.from({ length: 5 - (table.communityCards?.length || 0) }).map((_, index) => (
                          <div
                            key={`placeholder-${index}`}
                            className="w-12 h-16 bg-gray-600 rounded border-2 border-gray-500 opacity-30"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Community Cards Area */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="text-center mb-2">
                        {table.currentPot > 0 && (
                          <div className="text-poker-gold font-bold text-xl mb-1 drop-shadow-lg">
                            Pot: {formatCurrency(table.currentPot)}
                          </div>
                        )}
                        <div className="text-white font-semibold text-sm capitalize drop-shadow-md">
                          {table.gamePhase}
                        </div>
                      </div>
                      
                      {/* Community Cards */}
                      <div className="flex justify-center space-x-2">
                        {table.communityCards && table.communityCards.length > 0 ? (
                          table.communityCards.map((card, index) => (
                            <img
                              key={index}
                              src={`/cards/${card}.svg`}
                              alt={card}
                              className="w-12 h-16 rounded border-2 border-gray-300 shadow-lg"
                            />
                          ))
                        ) : null}

                        {Array.from({ length: 5 - (table.communityCards?.length || 0) }).map((_, index) => (
                          <div
                            key={`placeholder-${index}`}
                            className="w-12 h-16 bg-gray-600 rounded border-2 border-gray-500 opacity-30"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Animated hole cards - positioned exactly where static cards would be */}
                    {!animationComplete && animatedCards.map(({ playerId, card, index }, animIndex) => {
                      const player = table.players.find(p => p.id === playerId);
                      if (!player) return null;
                      
                      const { x, y, offsetX } = getCardPosition(player.position, index, table.maxPlayers);
                      const isCurrentUser = player.id === user?.id;
                      const cardSrc = isCurrentUser && card !== 'card_back' ? `/cards/${card}.svg` : '/cards/card_back.png';

                      return (
                        <motion.div
                          key={`${playerId}-${index}-${animIndex}`}
                          className="absolute w-16 h-22 pointer-events-none z-30"
                          initial={{ 
                            left: `${deckPosition.x}%`, 
                            top: `${deckPosition.y}%`,
                            x: '-50%',
                            y: '-50%',
                            scale: 0.8,
                            rotate: Math.random() * 10 - 5,
                            zIndex: 100 + animIndex
                          }}
                          animate={{ 
                            left: `${x}%`, 
                            top: `${y}%`,
                            x: `calc(-50% + ${offsetX}px)`,
                            y: '-50%',
                            scale: 1,
                            rotate: Math.random() * 4 - 2,
                          }}
                          transition={{ 
                            duration: 0.6,
                            ease: "easeOut",
                            delay: 0
                          }}
                          style={{
                            transformOrigin: 'center center'
                          }}
                        >
                          <img
                            src={cardSrc}
                            alt={isCurrentUser && card !== 'card_back' ? card : 'face-down card'}
                            className="w-full h-full object-contain rounded-lg shadow-xl"
                            onError={(e) => {
                              console.log('Animated card failed to load:', cardSrc);
                              e.currentTarget.src = '/cards/card_back.png';
                            }}
                          />
                        </motion.div>
                      );
                    })}
                    
                    {/* Empty seats - show at positions not occupied by players */}
                    {Array.from({ length: table.maxPlayers }).map((_, position) => {
                      const isOccupied = table.players.some(p => p.position === position);
                      
                      if (isOccupied) return null;
                      
                      const { x, y } = getPlayerPosition(position, table.maxPlayers);
                      
                      return (
                        <div
                          key={`empty-${position}`}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          <div className="w-16 h-16 rounded-full border-4 border-dashed border-gray-600 flex items-center justify-center hover:border-gray-500 transition-colors cursor-pointer">
                            <span className="text-gray-500 text-2xl">+</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* NEW: Action Buttons - REDESIGNED */}
            {isPlayer && 
              table.status === 'active' && 
              table.gamePhase !== 'finished' && 
              table.gamePhase !== 'showdown' &&
              table.gamePhase !== 'showdown' && ( 
                <div className="mt-6">
                {/* Player Status Card with Buttons on One Line */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-xl">
                  <div className="flex items-center justify-between gap-6">
                    {/* Left side - Status and Stats */}
                    <div className="flex items-center gap-6 flex-1">
                      <div className="text-white text-base font-semibold">
                        {isMyTurn ? (
                          <span className="flex items-center whitespace-nowrap">
                            <span className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                            <span className="text-green-400">Your Turn</span>
                          </span>
                        ) : (
                          <span className="flex items-center whitespace-nowrap">
                            <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                            <span className="text-gray-400">Waiting for {currentPlayer?.username || 'other player'}</span>
                          </span>
                        )}
                      </div>
                      
                      {myPlayer && (
                        <div className="flex gap-3 text-sm">
                          <div className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
                            <div className="text-gray-400 text-xs">Your Chips</div>
                            <div className="text-poker-gold font-bold whitespace-nowrap">{formatCurrency(myPlayer.chips)}</div>
                          </div>
                          <div className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
                            <div className="text-gray-400 text-xs">Current Bet</div>
                            <div className="text-white font-bold whitespace-nowrap">{formatCurrency(myPlayer.currentBet || 0)}</div>
                          </div>
                          {callAmount > 0 && (
                            <div className="bg-gray-900 rounded-lg px-3 py-2 border border-yellow-700">
                              <div className="text-gray-400 text-xs">To Call</div>
                              <div className="text-yellow-400 font-bold whitespace-nowrap">{formatCurrency(callAmount)}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side - Action Buttons */}
                    {isMyTurn && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={handleFold}
                          disabled={isActionLoading || (waitingForStateUpdate && String(user?.id) === lastActionPlayerId)}
                          variant="secondary"
                          className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 min-w-20 py-2 text-sm font-semibold shadow-lg border-2 border-red-500"
                        >
                          {isActionLoading ? '...' : 'Fold'}
                        </Button>
                        
                        {isFacingBet ? (
                          <>
                            {callAmount === 0 ? (
                              <Button
                                onClick={handleCheck}
                                disabled={isActionLoading || (waitingForStateUpdate && String(user?.id) === lastActionPlayerId)}
                                variant="secondary"
                                className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 min-w-20 py-2 text-sm font-semibold shadow-lg border-2 border-blue-500"
                              >
                                {isActionLoading ? '...' : 'Check'}
                              </Button>
                            ) : (
                              <Button
                                onClick={handleCall}
                                disabled={isActionLoading || (waitingForStateUpdate && String(user?.id) === lastActionPlayerId)}
                                className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 min-w-24 py-2 text-sm font-semibold shadow-lg border-2 border-green-500"
                              >
                                {isActionLoading ? '...' : 
                                  callAmount >= (myPlayer?.chips || 0)
                                    ? `All-In ${formatCurrency(myPlayer?.chips || 0)}`
                                    : `Call ${formatCurrency(callAmount)}`
                                }
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => {
                                const currentBetNow = table.players.reduce((max, p) => Math.max(max, p.currentBet || 0), 0);
                                const minRaiseIncrementNow = (table.lastRaiseAmount && table.lastRaiseAmount > 0) 
                                  ? table.lastRaiseAmount 
                                  : table.bigBlind;
                                const minRaiseNow = currentBetNow + minRaiseIncrementNow;
                                
                                setRaiseAmount(minRaiseNow);
                                setShowRaiseModal(true);
                              }}
                              disabled={isActionLoading || (myPlayer?.chips || 0) <= callAmount}
                              className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 min-w-20 py-2 text-sm font-semibold shadow-lg border-2 border-orange-500"
                            >
                              Raise
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={handleCheck}
                              disabled={isActionLoading || (waitingForStateUpdate && String(user?.id) === lastActionPlayerId)}
                              variant="secondary"
                              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 min-w-20 py-2 text-sm font-semibold shadow-lg border-2 border-blue-500"
                            >
                              {isActionLoading ? '...' : 'Check'}
                            </Button>
                            
                            <Button
                              onClick={() => {
                                setRaiseAmount(table.bigBlind);
                                setShowRaiseModal(true);
                              }}
                              disabled={isActionLoading || (myPlayer?.chips || 0) === 0}
                              className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 min-w-20 py-2 text-sm font-semibold shadow-lg border-2 border-orange-500"
                            >
                              Bet
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Message shown when NOT your turn */}
                {!isMyTurn && (
                  <div className="text-center text-gray-400 py-3 bg-gray-800 rounded-xl border border-gray-700 mt-3">
                    Wait for your turn to act
                  </div>
                )}
              </div>
            )}
            
            {/* Bet/Raise Modal */}
          {showRaiseModal && (() => {
            const currentBetNow = table.players.reduce((max, p) => Math.max(max, p.currentBet || 0), 0);
            const myPlayerNow = table.players.find(p => String(p.id) === String(user?.id));
            const isFacingBetNow = currentBetNow > 0;
            const minRaiseIncrementNow = (table.lastRaiseAmount && table.lastRaiseAmount > 0) 
              ? table.lastRaiseAmount 
              : table.bigBlind;
            const minRaiseNow = currentBetNow + minRaiseIncrementNow;
            const maxAmount = myPlayerNow?.chips || 0;
            const currentPot = table.currentPot || 0; // ✅ Define pot in modal scope
              
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                      {isFacingBetNow ? 'Raise Amount' : 'Bet Amount'}
                    </h2>
                    <button
                      onClick={() => setShowRaiseModal(false)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {isFacingBetNow ? 'Raise to:' : 'Bet amount:'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        min={isFacingBetNow ? minRaiseNow : table.bigBlind}
                        max={maxAmount}
                        step={table.bigBlind}
                        value={raiseAmount}
                        onChange={(e) => {
                          const inputValue = Number(e.target.value);
                          const cappedValue = Math.min(inputValue, maxAmount);
                          setRaiseAmount(cappedValue);
                        }}
                        onBlur={(e) => {
                          const inputValue = Number(e.target.value);
                          const minValue = isFacingBetNow ? minRaiseNow : table.bigBlind;
                          if (inputValue > maxAmount) {
                            setRaiseAmount(maxAmount);
                          } else if (inputValue < minValue) {
                            setRaiseAmount(minValue);
                          }
                        }}
                        className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-poker-gold"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Min: {formatCurrency(isFacingBetNow ? minRaiseNow : table.bigBlind)} | Max: {formatCurrency(maxAmount)}
                    </p>
                    {isFacingBetNow && (
                      <p className="text-xs text-gray-500 mt-2">
                        (Current bet: {formatCurrency(currentBetNow)} + Min raise: {formatCurrency(minRaiseIncrementNow)})
                      </p>
                    )}
                    
                    {/* Quick bet buttons */}
                    <div className="flex gap-2 mt-3">
                      {/* Min bet */}
                      <button
                        onClick={() =>
                          setRaiseAmount(isFacingBetNow ? minRaiseNow : table.bigBlind)
                        }
                        className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                      >
                        Min
                      </button>

                      {/* 1/2 Pot - ✅ FIXED: Use currentPot from scope */}
                      <button
                        onClick={() => {
                          const half = Math.floor(currentPot * 0.5);
                          const minBet = isFacingBetNow ? minRaiseNow : table.bigBlind;
                          setRaiseAmount(Math.min(Math.max(half, minBet), maxAmount));
                        }}
                        className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                      >
                        1/2 Pot
                      </button>

                      {/* 3/4 Pot - ✅ FIXED: Use currentPot from scope */}
                      <button
                        onClick={() => {
                          const threeQuarter = Math.floor(currentPot * 0.75);
                          const minBet = isFacingBetNow ? minRaiseNow : table.bigBlind;
                          setRaiseAmount(Math.min(Math.max(threeQuarter, minBet), maxAmount));
                        }}
                        className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                      >
                        3/4 Pot
                      </button>

                      {/* All-In */}
                      <button
                        onClick={() => setRaiseAmount(maxAmount)}
                        className="flex-1 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded font-semibold"
                      >
                        All-In
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button 
                      onClick={() => isFacingBetNow ? handleRaise(raiseAmount) : handleBet(raiseAmount)}
                      disabled={raiseAmount < (isFacingBetNow ? minRaiseNow : table.bigBlind) || raiseAmount > maxAmount}
                      className="flex-1"
                    >
                      {isFacingBetNow ? `Raise to ${formatCurrency(raiseAmount)}` : `Bet ${formatCurrency(raiseAmount)}`}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowRaiseModal(false)} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Table Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Table Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Game Type:</span>
                  <span className="text-white capitalize">{table.gameType.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Blinds:</span>
                  <span className="text-white">${table.smallBlind}/{table.bigBlind}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buy-in:</span>
                  <span className="text-white">
                    {formatCurrency(table.buyInMin)} - {formatCurrency(table.buyInMax)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`capitalize ${
                    table.status === 'active' ? 'text-green-400' :
                    table.status === 'waiting' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {table.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Join as Player Button */}
            {canJoinAsPlayer && (
              <Button
                onClick={() => setShowJoinModal(true)}
                className="w-full text-lg py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl"
              >
                Join as Player
              </Button>
            )}

            {/* Role Status */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">Your Status</h3>
              <div className={`text-center py-2 rounded font-semibold ${
                isPlayer ? 'bg-green-900 text-green-200' :
                isSpectator ? 'bg-blue-900 text-blue-200' :
                'bg-gray-900 text-gray-300'
              }`}>
                {isPlayer ? 'Player' : isSpectator ? 'Spectator' : 'Observer'}
              </div>
            </div>

            {/* Game Events Log */}
<div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
  <h3 className="text-lg font-semibold text-white mb-4">Game Events</h3>
  <div className="space-y-2 max-h-80 overflow-y-auto">
    {gameEvents.length > 0 ? (
      gameEvents.slice().reverse().map((event, index) => (
        <div
          key={index}
          className={`p-2 rounded text-sm ${
            event.type === 'separator' ? 'bg-gray-700 border-t-2 border-poker-gold text-center' :
            event.type === 'win' ? 'bg-gradient-to-r from-yellow-900 to-green-900 border-2 border-poker-gold' :
            event.type === 'bet' ? 'bg-orange-900' :
            event.type === 'fold' ? 'bg-red-900' :
            'bg-gray-900'
          }`}
        >
          <div className={`${
            event.type === 'separator' ? 'text-poker-gold font-bold' : 
            event.type === 'win' ? 'text-yellow-200 font-bold text-base' :
            'text-white'
          }`}>
            {event.type === 'win' && '🏆 '}{event.message}
          </div>
                      {event.type !== 'separator' && (
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    No events yet. Game will start soon!
                  </div>
                )}
              </div>
            </div>

            {/* Spectators List */}
            {/* {table.spectatorList && table.spectatorList.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Spectators ({table.spectatorList.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {table.spectatorList.map((spectator) => (
                    <div key={spectator.id} className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold">
                          {spectator.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-300">{spectator.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )} */}
          </div>
        </div>
      </main>

      {/* Join as Player Modal */}
      <JoinAsPlayerModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinAsPlayer}
        minBuyIn={table.buyInMin}
        maxBuyIn={table.buyInMax}
        isLoading={isJoining}
      /> 

      {/* Hand History Modal */}
      {/* <HandHistory
        tableId={tableId || ''}
        isOpen={showHandHistory}
        onClose={() => setShowHandHistory(false)}
      /> */}
    </div>
  );
};