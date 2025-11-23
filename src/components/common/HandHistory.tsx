// src/components/HandHistory.tsx
import React, { useState, useEffect } from 'react';
import { TableService } from '../../services/api/table';
import { UserService } from '../../services/api/user';

interface HandHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandHistory: React.FC<HandHistoryProps> = ({ isOpen, onClose }) => {
  const [hands, setHands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHand, setSelectedHand] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadHandHistory();
    }
  }, [isOpen]);

  const loadHandHistory = async () => {
    setIsLoading(true);
    try {
      const response = await UserService.getUserHandHistory(50);
      console.log('Full API response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      
      if (response.success) {
        const handsData = response.hands || [];
        console.log('Hands data:', handsData);
        console.log('Number of hands:', handsData.length);
        setHands(handsData);
      } else {
        console.error('API returned error:', response.error);
      }
    } catch (error) {
      console.error('Error loading hand history:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const ms = end - start;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Hand History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Hand List */}
          <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-gold"></div>
              </div>
            ) : hands.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                No hands played yet
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {hands.map((hand, index) => {
                  // Handle different possible data structures
                  const allPlayers = hand.all_players || [];
                  const winner = allPlayers.find((p: any) => p.is_winner) || 
                                { username: 'Unknown', profit: 0 };
                  
                  return (
                    <button
                      key={hand.hand_id || hand.id || index}
                      onClick={() => setSelectedHand(hand)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedHand?.hand_id === hand.hand_id || selectedHand?.id === hand.id
                          ? 'bg-gray-700 border-2 border-poker-gold'
                          : 'bg-gray-900 hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-semibold">
                          Hand #{hands.length - index}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(hand.started_at || hand.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>Table: <span className="text-blue-400">
                          {hand.table_id?.split('-').slice(0, -1).join(' ') || 'Unknown'}
                        </span></div>
                        <div>Winner: <span className="text-poker-gold">{winner.username}</span></div>
                        <div>Pot: <span className="text-white">{formatCurrency(hand.pot_size || 0)}</span></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hand Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedHand ? (
              <div className="space-y-6">
                {/* Hand Summary */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">Hand Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Time:</span>{' '}
                      <span className="text-white">{new Date(selectedHand.started_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>{' '}
                      <span className="text-white">{formatDuration(selectedHand.started_at, selectedHand.ended_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Table:</span>{' '}
                      <span className="text-white">{selectedHand.table_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Final Pot:</span>{' '}
                      <span className="text-white">{formatCurrency(selectedHand.pot_size)}</span>
                    </div>
                  </div>
                </div>

                {/* Board Cards */}
                {(selectedHand.board_flop || selectedHand.board_turn || selectedHand.board_river) && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-white mb-3">Board</h3>
                    <div className="flex gap-2">
                      {selectedHand.board_flop && (() => {
                        try {
                          const flopCards = typeof selectedHand.board_flop === 'string' 
                            ? JSON.parse(selectedHand.board_flop) 
                            : selectedHand.board_flop;
                          return flopCards.map((card: string, i: number) => (
                            <img
                              key={i}
                              src={`/cards/${card}.svg`}
                              alt={card}
                              className="w-12 h-16 rounded shadow-lg"
                            />
                          ));
                        } catch (e) {
                          console.error('Error parsing flop cards:', e);
                          return null;
                        }
                      })()}
                      {selectedHand.board_turn && (
                        <img
                          src={`/cards/${selectedHand.board_turn}.svg`}
                          alt={selectedHand.board_turn}
                          className="w-12 h-16 rounded shadow-lg ml-2"
                        />
                      )}
                      {selectedHand.board_river && (
                        <img
                          src={`/cards/${selectedHand.board_river}.svg`}
                          alt={selectedHand.board_river}
                          className="w-12 h-16 rounded shadow-lg"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Showdown Results - NEW SECTION */}
                {/* Hand Actions */}
                {selectedHand.actions && selectedHand.actions.length > 0 && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-white mb-3">Hand Actions</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedHand.actions.map((action: any, index: number) => {
                        const isGameAction = action.player === 'game' || !action.player;
                        const isWinAction = action.action?.includes('wins');
                        
                        return (
                          <div
                            key={index}
                            className={`p-2 rounded ${
                              isWinAction
                                ? 'bg-green-900 bg-opacity-30 border-l-4 border-green-500'
                                : isGameAction
                                ? 'bg-gray-800 border-l-4 border-blue-500'
                                : 'bg-gray-800 border-l-4 border-gray-600'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  action.phase === 'preflop' ? 'bg-blue-600' :
                                  action.phase === 'flop' ? 'bg-green-600' :
                                  action.phase === 'turn' ? 'bg-yellow-600' :
                                  action.phase === 'river' ? 'bg-red-600' :
                                  action.phase === 'showdown' ? 'bg-purple-600' :
                                  'bg-gray-600'
                                }`}>
                                  {action.phase}
                                </span>
                                <span className={`font-semibold ${
                                  isGameAction ? 'text-blue-300' : 
                                  isWinAction ? 'text-green-300' : 
                                  'text-white'
                                }`}>
                                  {action.player || 'Game'}
                                </span>
                                <span className="text-gray-300">{action.action}</span>
                              </div>
                              {action.pot > 0 && (
                                <span className="text-yellow-400 text-sm">
                                  Pot: {formatCurrency(action.pot)}
                                </span>
                              )}
                            </div>
                            
                            {/* Show winning hand if available */}
                            {isWinAction && action.winningHand && (
                              <div className="mt-2 flex gap-1">
                                {action.winningHand.map((card: string, i: number) => (
                                  <img
                                    key={i}
                                    src={`/cards/${card}.svg`}
                                    alt={card}
                                    className="w-10 h-14 rounded shadow-lg"
                                  />
                                ))}
                                {action.handDescription && (
                                  <div className="ml-2 flex items-center">
                                    <span className="text-yellow-400 font-semibold">
                                      {action.handDescription}
                                    </span>
                                    {action.handDisplay && (
                                      <span className="text-green-300 text-lg font-mono ml-2">
                                        ({action.handDisplay})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Players & Results */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">Players & Results</h3>
                  <div className="space-y-2">
                    {selectedHand.all_players?.map((player: any) => (
                      <div
                        key={player.username}
                        className={`p-3 rounded ${
                          player.profit > 0 ? 'bg-green-900' : player.profit < 0 ? 'bg-red-900' : 'bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">{player.username}</span>
                          <div className="text-right">
                            <div className={`font-bold ${
                              player.profit > 0 ? 'text-green-300' : player.profit < 0 ? 'text-red-300' : 'text-gray-300'
                            }`}>
                              {player.profit > 0 ? '+' : ''}{formatCurrency(player.profit)}
                            </div>
                            {player.is_winner && (
                              <div className="text-xs text-yellow-400">Winner</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a hand to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};