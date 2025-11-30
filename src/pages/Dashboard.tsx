// src/pages/Dashboard.tsx - FINAL CORRECTED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { TableService, TableData } from '../services/api/table';
import { StatsService } from '../services/api/stats'; 
import { Button } from '../components/common/Button';

// ----------------------------------------------------------------------
// LOCAL INTERFACE DEFINITIONS TO RESOLVE TYPESCRIPT ERRORS
// ----------------------------------------------------------------------

// Extending the expected TablePlayer interface to include avatar_url for the fix
interface PlayerWithAvatar {
  id: string;
  username: string;
  chips: number;
  // REMOVE stack: number;
  position: number;
  avatar_url?: string | null;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

// Extending the expected TableData interface from the API to use the fixed player type
interface DashboardTableData extends TableData {
  players: PlayerWithAvatar[];
}

// Assuming UserStats structure based on usage
interface UserStats {
  totalWinnings: number;
  handsPlayed: number;
  gamesPlayed: number;
  winRate: number;
  handsWon: number;
  biggestPot: number;
}
// ----------------------------------------------------------------------
// END INTERFACE DEFINITIONS
// ----------------------------------------------------------------------


export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tables, setTables] = useState<DashboardTableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load tables on component mount
  useEffect(() => {
    loadTables();
    // Refresh tables every 30 seconds
    const interval = setInterval(loadTables, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await StatsService.getUserStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

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
        // We cast the incoming data to our extended type for safety
        const transformedTables: DashboardTableData[] = response.tables.map(table => ({
          ...table,
          currentPlayers: table.currentPlayers ?? table.players.length,
          spectators: table.spectators ?? 0,
          spectatorList: table.spectatorList ?? [],
          communityCards: table.communityCards ?? [],
          userRole: table.userRole ?? 'none'
        })) as DashboardTableData[]; 
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
      const response = await TableService.joinAsSpectator(tableId);
      
      if (response.success) {
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
      {/* Animated background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-poker-gold opacity-5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 -left-40 w-96 h-96 bg-green-600 opacity-5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gray-900 bg-opacity-50 backdrop-blur-sm border-b-2 border-poker-gold shadow-lg">
        <nav className="flex justify-between items-center max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-lg flex items-center justify-center transform hover:scale-110 transition-transform">
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
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-poker-gold to-yellow-600 flex items-center justify-center">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url}  
                    alt={`${user.username} avatar`} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-900 font-semibold text-lg">
                    {user?.username.charAt(0).toUpperCase()}
                  </span>
                )}
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
               <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[100]"> 
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setTimeout(() => setIsProfileOpen(false), 50);
                    }}
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
                    onClick={() => {
                      logout();
                      setTimeout(() => setIsProfileOpen(false), 50);
                    }}
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-poker-gold">{user?.username}</span>! 👋
          </h1>
          <p className="text-lg text-gray-400">
            Ready to play some poker? Choose a table below to get started.
          </p>
        </div>

        {/* Quick Stats Section */}
        {/* Quick Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-poker-gold transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Winnings</h3>
              <svg className="w-5 h-5 text-poker-gold" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(stats?.totalWinnings || 0)}
                </p>
                <p className={`text-sm mt-1 ${(stats?.totalWinnings || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Lifetime earnings
                </p>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Hands Played</h3>
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-white">{stats?.handsPlayed || 0}</p>
                <p className="text-gray-400 text-sm mt-1">{stats?.gamesPlayed || 0} games</p>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-green-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Win Rate</h3>
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
              </svg>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-white">{(stats?.winRate || 0).toFixed(1)}%</p>
                <p className="text-gray-400 text-sm mt-1">{stats?.handsWon || 0} hands won</p>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-purple-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Biggest Pot</h3>
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"/>
              </svg>
            </div>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-white">{formatCurrency(stats?.biggestPot || 0)}</p>
                <p className="text-gray-400 text-sm mt-1">Best hand</p>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900 bg-opacity-50 border border-red-700 text-red-100 px-4 py-3 rounded-lg backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-200 hover:text-white text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Active Tables Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="w-2 h-8 bg-poker-gold rounded-full mr-3"></span>
              Active Tables ({tables.length})
            </h2>
            <Button onClick={loadTables} variant="secondary" className="text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {/* Tables Grid */}
          <div className="grid gap-6">
            {tables.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700">
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="text-gray-400 text-xl mb-4">No active tables at the moment</div>
                <p className="text-gray-500 mb-6">Check back soon or create your own table</p>
                <Button onClick={loadTables} variant="secondary">
                  Refresh Tables
                </Button>
              </div>
            ) : (
              tables.map((table) => (
                <div
                  key={table.id}
                  className="group bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-poker-gold transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-poker-gold/20 transform hover:-translate-y-1"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Table Image */}
                    <div className="lg:w-1/3 relative overflow-hidden">
                      <img 
                        src="/poker_hand.png" 
                        alt={`${table.name} poker table`}
                        className="w-full h-48 lg:h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzM3NDE0YiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjZmZiZDRhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+4pmgIFBva2VyIFRhYmxlPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50"></div>
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${getTableStatusColor(table.status)}`}>
                          {getTableStatusText(table.status)}
                        </span>
                      </div>
                      {table.currentPot > 0 && (
                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 backdrop-blur-sm px-4 py-2 rounded-lg border border-poker-gold">
                          <p className="text-poker-gold text-xs font-semibold mb-1">CURRENT POT</p>
                          <p className="text-white text-xl font-bold">{formatCurrency(table.currentPot)}</p>
                        </div>
                      )}
                    </div>

                    {/* Table Info */}
                    <div className="lg:w-2/3 p-6 flex flex-col justify-between">
                      <div>
                        {/* Table Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-poker-gold transition-colors">
                              {table.name}
                            </h3>
                            <p className="text-poker-gold text-sm font-semibold uppercase tracking-wide">
                              {table.gameType.replace('-', ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-poker-gold">
                              {formatCurrency(table.buyInMin)}
                            </p>
                            <p className="text-sm text-gray-400">to {formatCurrency(table.buyInMax)}</p>
                          </div>
                        </div>

                        {/* Game Details */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3 text-center border border-gray-700">
                            <p className="text-xl font-bold text-white">{table.currentPlayers}/{table.maxPlayers}</p>
                            <p className="text-gray-400 text-xs">Players</p>
                          </div>
                          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3 text-center border border-gray-700">
                            <p className="text-xl font-bold text-poker-gold">{formatBlinds(table.smallBlind, table.bigBlind)}</p>
                            <p className="text-gray-400 text-xs">Blinds</p>
                          </div>
                          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3 text-center border border-gray-700">
                            <p className="text-xl font-bold text-green-400">
                              {Math.round((table.currentPlayers / table.maxPlayers) * 100)}%
                            </p>
                            <p className="text-gray-400 text-xs">Filled</p>
                          </div>
                          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-3 text-center border border-gray-700">
                            <p className="text-xl font-bold text-white capitalize">{table.gamePhase}</p>
                            <p className="text-gray-400 text-xs">Phase</p>
                          </div>
                        </div>

                        {/* Player Avatars and Join Button */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center">
                            <p className="text-gray-400 text-sm mr-3">Active Players:</p>
                            <div className="flex -space-x-2">
                              {table.players.slice(0, 5).map((player) => (
                                <div
                                  key={player.id}
                                  className="w-10 h-10 rounded-full border-2 border-gray-700 hover:border-poker-gold hover:z-10 transition-all overflow-hidden bg-gradient-to-br from-poker-gold to-yellow-600 flex items-center justify-center cursor-pointer"
                                  // FIX: Use player.chips ?? 0 to resolve 'number | undefined' error
                                  title={`${player.username} - ${formatCurrency(player.chips ?? 0)}`}
                                >
                                  {/* FIX: Check for avatar_url and use /uploads/ prefix */}
                                  {player.avatar_url ? (
                                    <img
                                      src={player.avatar_url} 
                                      alt={`${player.username} avatar`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-gray-900 font-bold text-sm">
                                      {player.username.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {table.players.length > 5 && (
                                <div className="w-10 h-10 rounded-full border-2 border-gray-700 bg-gray-600 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">+{table.players.length - 5}</span>
                                </div>
                              )}
                              {table.currentPlayers < table.maxPlayers && (
                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center hover:border-green-500 transition-colors">
                                  <span className="text-gray-500 text-lg">+</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Join Button */}
                          <Button
                            onClick={() => handleJoinTable(table.id)}
                            className="w-full sm:w-auto px-8 py-3 text-base font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            <span className="flex items-center justify-center">
                              View Table
                              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};