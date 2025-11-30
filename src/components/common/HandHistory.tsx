// src/components/HandHistory.tsx - UPDATED
import React, { useState, useEffect } from 'react';
import { TableService } from '../../services/api/table';
import { UserService } from '../../services/api/user';
import { AIHandAnalysis } from './AIHandAnalysis';

interface HandHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  // NEW: Prop to directly select a hand when opening the modal
  initialSelectedHand?: any; 
}

export const HandHistory: React.FC<HandHistoryProps> = ({ isOpen, onClose, initialSelectedHand }) => {
  const [hands, setHands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHand, setSelectedHand] = useState<any>(null);
  const [aiAnalysisHand, setAiAnalysisHand] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadHandHistory();
    }
  }, [isOpen]);

  // NEW: Use effect to set the initial hand if provided
  useEffect(() => {
    if (initialSelectedHand) {
      setSelectedHand(initialSelectedHand);
    }
  }, [initialSelectedHand]);

  const loadHandHistory = async () => {
    setIsLoading(true);
    try {
      const response = await UserService.getUserHandHistory(50);
      
      if (response.success) {
        const handsData = response.hands || [];
        setHands(handsData);
        // If no initial hand was passed, select the first one in the list
        if (!initialSelectedHand && handsData.length > 0) {
            setSelectedHand(handsData[0]);
        }
      } else {
        console.error('API returned error:', response.error);
      }
    } catch (error) {
      console.error('Error loading hand history:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ... (formatCurrency, formatTime, formatDuration functions remain the same) ...

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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"> {/* Increased opacity for better focus */}
        <div className={`bg-gray-800 rounded-xl w-full max-w-7xl max-h-[90vh] flex flex-col transition-all duration-300 border border-gray-700 shadow-2xl ${
          aiAnalysisHand ? 'mr-[32rem]' : ''
        }`}>
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2 text-poker-gold">📜</span> Hand History
            </h2>
            <button
              onClick={() => {
                setAiAnalysisHand(null);
                onClose();
              }}
              className="text-gray-400 hover:text-white text-2xl p-1 rounded-full hover:bg-gray-700 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Hand List */}
            <div className="w-1/3 min-w-[20rem] border-r border-gray-700 overflow-y-auto scrollbar-thin-dark">
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
                    const allPlayers = hand.all_players || [];
                    const userResult = allPlayers.find((p: any) => p.username === 'current_user_placeholder'); // Adjust this lookup
                    const userProfit = userResult?.profit || 0;
                    
                    return (
                      <button
                        key={hand.hand_id || hand.id || index}
                        onClick={() => setSelectedHand(hand)}
                        className={`w-full text-left p-4 rounded-lg transition-all duration-150 border-2 ${
                          selectedHand?.hand_id === hand.hand_id || selectedHand?.id === hand.id
                            ? 'bg-gray-700 border-poker-gold shadow-lg'
                            : 'bg-gray-900 hover:bg-gray-700/50 border-gray-900 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-bold">
                            Hand #{hands.length - index}
                          </span>
                          <span className={`text-sm font-semibold ${userProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {userProfit >= 0 ? '+' : ''}{formatCurrency(userProfit)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex justify-between">
                            <span>Table: <span className="text-blue-400 font-medium">
                                {hand.table_id?.split('-').slice(0, -1).join(' ') || 'Unknown'}
                            </span></span>
                            <span>{formatTime(hand.started_at || hand.timestamp)}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAiAnalysisHand(hand);
                          }}
                          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="text-sm">🤖 View AI Analysis</span>
                        </button>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hand Details */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedHand ? (
                // ... (The Hand Details section logic remains the same) ...
                <div className="space-y-6">
                  {/* Hand Summary */}
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 shadow-inner">
                    <h3 className="text-xl font-bold text-poker-gold mb-4 border-b border-gray-700 pb-2">Hand Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Time:</span>{' '}
                        <span className="text-white font-medium">{new Date(selectedHand.started_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Duration:</span>{' '}
                        <span className="text-white font-medium">{formatDuration(selectedHand.started_at, selectedHand.ended_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Table ID:</span>{' '}
                        <span className="text-white font-medium">{selectedHand.table_id}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Final Pot:</span>{' '}
                        <span className="text-white font-medium">{formatCurrency(selectedHand.pot_size)}</span>
                      </div>
                    </div>
                    
                    {/* AI Analysis Button */}
                    <button
                      onClick={() => setAiAnalysisHand(selectedHand)}
                      className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      🤖 Get AI Analysis
                    </button>
                  </div>

                  {/* Board Cards */}
                  {(selectedHand.board_flop || selectedHand.board_turn || selectedHand.board_river) && (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Community Cards</h3>
                      <div className="flex gap-3 justify-center">
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
                                className="w-16 h-24 rounded-lg shadow-xl border-2 border-poker-gold/50"
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
                            className="w-16 h-24 rounded-lg shadow-xl border-2 border-poker-gold/50"
                          />
                        )}
                        {selectedHand.board_river && (
                          <img
                            src={`/cards/${selectedHand.board_river}.svg`}
                            alt={selectedHand.board_river}
                            className="w-16 h-24 rounded-lg shadow-xl border-2 border-poker-gold/50"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hand Actions */}
                  {selectedHand.actions && selectedHand.actions.length > 0 && (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Action Log</h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin-dark">
                        {selectedHand.actions.map((action: any, index: number) => {
                          const isGameAction = action.player === 'game' || !action.player;
                          const isWinAction = action.action?.includes('wins');
                          
                          const phaseColor = 
                            action.phase === 'preflop' ? 'bg-blue-600' :
                            action.phase === 'flop' ? 'bg-green-600' :
                            action.phase === 'turn' ? 'bg-yellow-600' :
                            action.phase === 'river' ? 'bg-red-600' :
                            action.phase === 'showdown' ? 'bg-purple-600' :
                            'bg-gray-600';
                            
                          const actionColor = 
                            isWinAction ? 'border-green-500' : 
                            isGameAction ? 'border-blue-500' : 
                            'border-gray-600';
                            
                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg bg-gray-800 transition-shadow duration-150 border-l-4 ${actionColor}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${phaseColor} text-white`}>
                                    {action.phase}
                                  </span>
                                  <span className={`font-semibold text-lg ${
                                    isGameAction ? 'text-blue-300' : 
                                    isWinAction ? 'text-green-300' : 
                                    'text-white'
                                  }`}>
                                    {action.player || 'Game'}
                                  </span>
                                  <span className="text-gray-300 text-lg">{action.action}</span>
                                </div>
                                {action.pot > 0 && (
                                  <span className="text-yellow-400 font-semibold text-lg">
                                    Pot: {formatCurrency(action.pot)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Show winning hand if available */}
                              {isWinAction && action.winningHand && (
                                <div className="mt-2 pt-2 border-t border-gray-700 flex flex-wrap items-center gap-2">
                                  <span className="text-yellow-400 font-semibold">Winning Hand:</span>
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
                                      <span className="text-poker-gold font-bold">
                                        {action.handDescription}
                                      </span>
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
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Players & Final Results</h3>
                    <div className="space-y-2">
                      {selectedHand.all_players?.map((player: any) => (
                        <div
                          key={player.username}
                          className={`p-4 rounded-lg flex justify-between items-center transition-colors ${
                            player.is_winner ? 'bg-poker-gold/20 border border-poker-gold' : 
                            player.profit > 0 ? 'bg-green-900/40' : 
                            player.profit < 0 ? 'bg-red-900/40' : 
                            'bg-gray-800'
                          }`}
                        >
                          <span className="text-white font-semibold text-lg">{player.username}</span>
                          <div className="text-right">
                            <div className={`font-bold text-lg ${
                              player.profit > 0 ? 'text-green-300' : player.profit < 0 ? 'text-red-300' : 'text-gray-300'
                            }`}>
                              {player.profit > 0 ? '+' : ''}{formatCurrency(player.profit)}
                            </div>
                            {player.is_winner && (
                              <div className="text-xs text-poker-gold font-bold mt-0.5">🏆 WINNER</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                  Select a hand from the list to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Render AI Analysis Panel outside the main modal */}
      <AIHandAnalysis
        hand={aiAnalysisHand}
        isOpen={!!aiAnalysisHand}
        onClose={() => setAiAnalysisHand(null)}
      />
    </>
  );
};