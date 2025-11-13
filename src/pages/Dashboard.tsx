// src/pages/Dashboard.tsx - COMPLETE FIXED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { TableService, TableData } from '../services/api/table';
import { Button } from '../components/common/Button';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tables, setTables] = useState<TableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load tables on component mount
  useEffect(() => {
    loadTables();
    // Refresh tables every 30 seconds
    const interval = setInterval(loadTables, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTables = async () => {
    try {
      const response = await TableService.getTables();
      if (response.success && response.tables) {
        // Transform tables to match expected interface, ensuring all required fields are present
        const transformedTables: TableData[] = response.tables.map(table => ({
          ...table,
          currentPlayers: table.currentPlayers ?? table.players.length,
          spectators: table.spectators ?? 0,
          spectatorList: table.spectatorList ?? [],
          communityCards: table.communityCards ?? [],
          userRole: table.userRole ?? 'none'
        }));
        setTables(transformedTables);
        setError(null);
      } else {
        setError(response.error || 'Failed to load tables');
      }
    } catch (err) {
      setError('Network error loading tables');
      console.error('Error loading tables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTable = async (tableId: string) => {
    try {
      setError(null);
      // First join as spectator to view the table
      const response = await TableService.joinAsSpectator(tableId);
      
      if (response.success) {
        // Navigate to the table view
        navigate(`/table/${tableId}`);
      } else {
        setError(response.error || 'Failed to join table');
      }
    } catch (err) {
      setError('Network error joining table');
      console.error('Error joining table:', err);
    }
  };

  const goToProfile = () => {
    setIsProfileOpen(false);
    navigate('/profile');
  };

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600 text-green-100';
      case 'waiting':
        return 'bg-yellow-600 text-yellow-100';
      default:
        return 'bg-red-600 text-red-100';
    }
  };

  const getTableStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'waiting':
        return 'Waiting';
      default:
        return 'Full';
    }
  };

  const formatBlinds = (smallBlind: number, bigBlind: number) => {
    return `$${smallBlind}/$${bigBlind}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-gold"></div>
          <div className="text-white text-xl">Loading tables...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900 border-b-2 border-poker-gold shadow-lg">
        <nav className="flex justify-between items-center max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">♠️</span>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-poker-gold to-yellow-400 bg-clip-text text-transparent">
              Poker Review
            </div>
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700 hover:border-poker-gold transition-all"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-gray-900 font-semibold text-lg">
                  {user?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block font-medium text-white">{user?.username}</span>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-10">
                <div className="py-2">
                  <button
                    onClick={goToProfile}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View Profile
                    </span>
                  </button>
                  <hr className="my-1 border-gray-700" />
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-red-400 hover:bg-red-900 hover:text-red-300 transition-colors"
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome back, <span className="text-poker-gold">{user?.username}</span>!
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose from our active poker tables and start playing with AI-powered analysis to improve your game
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-200 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Active Tables Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-poker-gold to-transparent w-20"></div>
              <h2 className="text-3xl font-bold text-white mx-6">
                Active Tables ({tables.length})
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-poker-gold to-transparent w-20"></div>
            </div>
            <Button onClick={loadTables} variant="secondary" className="text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {/* Tables List */}
          <div className="space-y-6">
            {tables.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="text-gray-400 text-xl mb-4">No tables available</div>
                <Button onClick={loadTables} variant="secondary">
                  Try Refreshing
                </Button>
              </div>
            ) : (
              tables.map((table) => (
                <div
                  key={table.id}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-poker-gold transition-all duration-300 shadow-xl hover:shadow-2xl"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Table Image */}
                    <div className="lg:w-1/3 relative">
                      <img 
                        src="/poker_hand.png" 
                        alt={`${table.name} poker table`}
                        className="w-full h-48 lg:h-full object-cover"
                        onError={(e) => {
                          // Fallback for missing image
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzM3NDE0YiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UG9rZXIgVGFibGU8L3RleHQ+PC9zdmc+';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTableStatusColor(table.status)}`}>
                          {getTableStatusText(table.status)}
                        </span>
                      </div>
                    </div>

                    {/* Table Info */}
                    <div className="lg:w-2/3 p-6 flex flex-col justify-between">
                      <div>
                        {/* Table Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-1">
                              {table.name}
                            </h3>
                            <p className="text-poker-gold text-lg font-semibold capitalize">
                              {table.gameType.replace('-', ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-poker-gold">
                              {formatCurrency(table.buyInMin)} - {formatCurrency(table.buyInMax)}
                            </p>
                            <p className="text-gray-400">Buy-in Range</p>
                          </div>
                        </div>

                        {/* Game Details */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="bg-gray-900 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-white">{table.currentPlayers}</p>
                            <p className="text-gray-400 text-sm">Players</p>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-white">{table.maxPlayers}</p>
                            <p className="text-gray-400 text-sm">Max Seats</p>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-poker-gold">{formatBlinds(table.smallBlind, table.bigBlind)}</p>
                            <p className="text-gray-400 text-sm">Blinds</p>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-400">
                              {Math.round((table.currentPlayers / table.maxPlayers) * 100)}%
                            </p>
                            <p className="text-gray-400 text-sm">Full</p>
                          </div>
                        </div>

                        {/* Player Avatars and Join Button */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <p className="text-gray-400 mr-3">Players:</p>
                            <div className="flex -space-x-2">
                              {table.players.slice(0, 6).map((player, index) => (
                                <div
                                  key={player.id}
                                  className="w-10 h-10 rounded-full border-2 border-gray-700 hover:border-poker-gold transition-colors bg-gradient-to-br from-poker-gold to-yellow-600 flex items-center justify-center"
                                  title={`${player.username} - ${formatCurrency(player.chips)}`}
                                >
                                  <span className="text-gray-900 font-semibold text-sm">
                                    {player.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              ))}
                              {table.players.length > 6 && (
                                <div className="w-10 h-10 rounded-full border-2 border-gray-700 bg-gray-600 flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">+{table.players.length - 6}</span>
                                </div>
                              )}
                              {Array.from({ length: Math.max(0, Math.min(6, table.maxPlayers - table.currentPlayers)) }).map((_, index) => (
                                <div 
                                  key={`empty-${index}`} 
                                  className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center"
                                  title="Empty seat"
                                >
                                  <span className="text-gray-600 text-lg">+</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Join Button */}
                          <Button
                            onClick={() => handleJoinTable(table.id)}
                            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            View Table
                          </Button>
                        </div>

                        {/* Additional Info */}
                        {table.currentPot > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Current Pot:</span>
                              <span className="text-poker-gold font-bold text-lg">
                                {formatCurrency(table.currentPot)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Game Phase:</span>
                              <span className="text-white font-semibold capitalize">
                                {table.gamePhase}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-poker-gold rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Games Played</h3>
            <p className="text-3xl font-bold text-poker-gold">0</p>
            <p className="text-gray-400 text-sm mt-2">Start playing to see stats</p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Win Rate</h3>
            <p className="text-3xl font-bold text-green-400">--%</p>
            <p className="text-gray-400 text-sm mt-2">Join a game to start tracking</p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Insights</h3>
            <p className="text-3xl font-bold text-blue-400">0</p>
            <p className="text-gray-400 text-sm mt-2">Play to get AI recommendations</p>
          </div>
        </div>
      </main>
    </div>
  );
};