// src/components/HandHistory.tsx
import React, { useState, useEffect } from 'react';
import { TableService } from '../../services/api/table';

interface HandHistoryProps {
  tableId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const HandHistory: React.FC<HandHistoryProps> = ({ tableId, isOpen, onClose }) => {
  const [hands, setHands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHand, setSelectedHand] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadHandHistory();
    }
  }, [isOpen, tableId]);

  const loadHandHistory = async () => {
    setIsLoading(true);
    try {
      const response = await TableService.getHandHistory(tableId, 20);
      if (response.success) {
        setHands(response.hands || []);
      }
    } catch (error) {
      console.error('Error loading hand history:', error);
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

  const formatDuration = (ms: number) => {
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
                  const winner = hand.endingStacks?.find((s: any) => s.profit > 0);
                  return (
                    <button
                      key={hand.handId}
                      onClick={() => setSelectedHand(hand)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedHand?.handId === hand.handId
                          ? 'bg-gray-700 border-2 border-poker-gold'
                          : 'bg-gray-900 hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-semibold">
                          Hand #{hands.length - index}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(hand.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>Winner: <span className="text-poker-gold">{winner?.username || 'N/A'}</span></div>
                        <div>Duration: {formatDuration(hand.duration)}</div>
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
                      <span className="text-white">{new Date(selectedHand.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>{' '}
                      <span className="text-white">{formatDuration(selectedHand.duration)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Blinds:</span>{' '}
                      <span className="text-white">${selectedHand.smallBlind}/${selectedHand.bigBlind}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Dealer Position:</span>{' '}
                      <span className="text-white">Seat {selectedHand.dealerPosition + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Board Cards */}
                {selectedHand.boardCards && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-white mb-3">Board</h3>
                    <div className="flex gap-2">
                      {selectedHand.boardCards.flop?.map((card: string, i: number) => (
                        <img
                          key={i}
                          src={`/cards/${card}.svg`}
                          alt={card}
                          className="w-12 h-16 rounded shadow-lg"
                        />
                      ))}
                      {selectedHand.boardCards.turn && (
                        <img
                          src={`/cards/${selectedHand.boardCards.turn}.svg`}
                          alt={selectedHand.boardCards.turn}
                          className="w-12 h-16 rounded shadow-lg ml-2"
                        />
                      )}
                      {selectedHand.boardCards.river && (
                        <img
                          src={`/cards/${selectedHand.boardCards.river}.svg`}
                          alt={selectedHand.boardCards.river}
                          className="w-12 h-16 rounded shadow-lg"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Action Timeline */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">Action Timeline</h3>
                  <div className="space-y-2 text-sm">
                    {selectedHand.actions?.map((action: any, index: number) => (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          action.player === 'game' ? 'bg-blue-900' : 'bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className={`font-semibold ${
                              action.player === 'game' ? 'text-blue-300' : 'text-white'
                            }`}>
                              {action.player}
                            </span>
                            {' - '}
                            <span className="text-gray-300">{action.action}</span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            Pot: {formatCurrency(action.pot)}
                          </div>
                        </div>
                        {action.phase !== 'preflop' && (
                          <div className="text-xs text-gray-500 mt-1 capitalize">
                            {action.phase}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Players & Results */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">Players & Results</h3>
                  <div className="space-y-2">
                    {selectedHand.endingStacks?.map((player: any) => (
                      <div
                        key={player.id}
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
                            <div className="text-xs text-gray-400">
                              {formatCurrency(player.chips)} chips
                            </div>
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