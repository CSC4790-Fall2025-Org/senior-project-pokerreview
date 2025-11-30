import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 👇 FIX: Destructure the new updateUser function
import { useAuthStore } from '../store/authStore'; 
import { UserService, UserProfile } from '../services/api/user';
import { TableService } from '../services/api/table'; 
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { HandHistory } from '../components/common/HandHistory';

// Mock HandHistory type for the preview section
interface RecentHand {
  id: string;
  table_name: string;
  time: string;
  result_text: string;
  profit: number;
  rawHandData: any; 
}

export const Profile: React.FC = () => {
  // 👇 FIX: Include updateUser from the store
  const { user, logout, updateUser } = useAuthStore(); 
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showHandHistory, setShowHandHistory] = useState(false);
  const [selectedHandInModal, setSelectedHandInModal] = useState<any>(null); 
  const [recentHands, setRecentHands] = useState<RecentHand[]>([]);
  const [isUploading, setIsUploading] = useState(false); 
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  // Load user profile and recent hands on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // 1. Load Profile
      const profileResponse = await UserService.getProfile();
      if (profileResponse.success && profileResponse.user) {
        setUserProfile(profileResponse.user); 
        
        // 🚀 FIX 1: Destructure and remove the incompatible 'id' property before calling updateUser
        const { id, ...updateData } = profileResponse.user;
        updateUser(updateData);
        
        setFormData({
          username: profileResponse.user.username,
          email: profileResponse.user.email,
        });
      } else {
        setError(profileResponse.error || 'Failed to load profile');
      }

      // 2. Load Recent Hands (Mocked API call for structure)
      try {
        const handsResponse = await UserService.getUserHandHistory(10); 
        if (handsResponse.success && handsResponse.hands) {
          const handsData: RecentHand[] = handsResponse.hands.map((hand: any) => {
            const playerResult = hand.all_players?.find((p: any) => p.username === user?.username);
            const profit = playerResult?.profit || 0;
            const tableIdPart = hand.table_id?.split('-').slice(0, -1).join(' ');
            return {
              id: hand.hand_id || hand.id,
              table_name: tableIdPart || 'Unknown Table',
              time: new Date(hand.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              profit: profit,
              rawHandData: hand, 
              result_text: profit > 0 ? 'Win' : profit < 0 ? 'Loss' : 'Chop',
            };
          });
          setRecentHands(handsData);
        }
      } catch (err) {
        console.error('Error loading recent hands:', err);
      }

      setIsLoading(false);
    };

    loadData();
  }, [user?.username, updateUser]); // Added updateUser to dependencies
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // NEW HANDLER: For avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await UserService.uploadAvatar(file);

      if (response.success && response.user) {
        // 🚀 FIX 2: Destructure and remove the incompatible 'id' property before calling updateUser
        const { id, ...updateData } = response.user;
        
        // 1. Update userProfile state with the new avatar_url (for immediate view update)
        setUserProfile(response.user); 
        // 2. Update the global auth store state (for persistence across pages/refreshes)
        updateUser(updateData);
      } else {
        setError(response.error || 'Failed to upload image.');
      }
    } catch (err) {
      setError('An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      // Reset the file input value so the user can upload the same file again
      e.target.value = ''; 
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await UserService.updateProfile(formData);
      
      if (response.success && response.user) {
        // 🚀 FIX 3: Destructure and remove the incompatible 'id' property before calling updateUser
        const { id, ...updateData } = response.user;
        
        setUserProfile(response.user);
        updateUser(updateData); // Update store after name/email change too
        setIsEditing(false);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: userProfile?.username || user?.username || '',
      email: userProfile?.email || user?.email || '',
    });
    setIsEditing(false);
    setError(null);
  };
  
  const handleOpenHandHistory = (hand: any | null = null) => {
    if (hand) {
      setSelectedHandInModal(hand.rawHandData);
    } else {
      setSelectedHandInModal(null);
    }
    setShowHandHistory(true);
  };
  
  const handleCloseHandHistory = () => {
      setShowHandHistory(false);
      setSelectedHandInModal(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading && !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-poker-green flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  // 👇 FIX: displayUser will now reliably have the latest avatar_url from the store if userProfile is null
  const displayUser = userProfile || user; 
  const winRate = userProfile?.win_rate || 0;
  const profitColor = winRate >= 50 ? 'text-green-400' : winRate > 0 ? 'text-yellow-400' : 'text-red-400';
  const totalWinnings = userProfile?.total_winnings || 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-900 bg-opacity-70 backdrop-blur-sm p-4 border-b border-poker-gold/50 shadow-lg">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-400 hover:text-poker-gold transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <div className="text-2xl font-bold bg-gradient-to-r from-poker-gold to-yellow-400 bg-clip-text text-transparent">
            {displayUser?.username}'s Profile
          </div>
          <Button onClick={logout} variant="secondary" className="bg-red-600 hover:bg-red-700 text-white text-sm">
            Sign Out
          </Button>
        </nav>
      </header>

      {/* Main Content: Increased max-width to 7xl */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="space-y-10">
          
          {/* Section 1: User Info and Editing */}
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-2xl">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center">
                
                {/* START: AVATAR UPLOAD COMPONENT */}
                <div className="relative w-24 h-24 mr-6">
                {/* Avatar Display */}
                {displayUser?.avatar_url ? (
                  <img
                    src={displayUser.avatar_url}
                    alt={`${displayUser.username}'s Avatar`}
                    className="w-full h-full rounded-full object-cover border-4 border-poker-gold shadow-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-poker-gold to-yellow-600 rounded-full flex items-center justify-center shadow-xl">
                    <span className="text-gray-900 font-extrabold text-4xl">
                      {displayUser?.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Upload Button */}
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center cursor-pointer border-2 border-gray-800 transition-colors"
                >
                  {isUploading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <span className="text-white text-lg leading-none transform translate-y-[-1px]">▲</span>
                  )}
                </label>
              </div>
              {/* END: AVATAR UPLOAD COMPONENT */}
              
                <div>
                  <h1 className="text-4xl font-extrabold text-white">{displayUser?.username}</h1>
                  <p className="text-gray-400 mt-1">
                    Member since {new Date((userProfile?.created_at || user?.createdAt) || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              
              {!isEditing && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                  className="text-base px-6 py-2 border-poker-gold/50 hover:bg-gray-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit Profile
                </Button>
              )}
            </div>
            
            {/* Editing Form */}
            {isEditing ? (
                <div className="pt-6 border-t border-gray-700">
                    <h2 className="text-2xl font-semibold text-white mb-4">Update Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                        />
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex space-x-4 pt-6">
                        <Button 
                            onClick={handleSave} 
                            className="flex-1 max-w-xs"
                            isLoading={isLoading}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button 
                            onClick={handleCancel} 
                            variant="secondary" 
                            className="flex-1 max-w-xs"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-700 text-lg">
                    <div>
                        <p className="text-gray-400">Email:</p>
                        <p className="text-white font-medium">{displayUser?.email}</p>
                    </div>
                    <div>
                        <p className="text-gray-400">Total Games:</p>
                        <p className="text-white font-medium">{userProfile?.games_played || 0}</p>
                    </div>
                </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mt-6">
                {error}
              </div>
            )}
          </div>
          
          {/* Section 2: Game Statistics - Enhanced Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Total Winnings */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg col-span-1">
              <div className="text-gray-400 text-lg font-semibold mb-2 flex items-center">
                <span className="mr-2 text-yellow-500">🏆</span> Total Net Winnings
              </div>
              <div className={`text-4xl font-extrabold ${totalWinnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(totalWinnings)}
              </div>
              <p className="text-gray-500 text-sm mt-1">Overall profit/loss across all hands.</p>
            </div>
            
            {/* Card 2: Win Rate */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-lg font-semibold mb-1 flex items-center">
                  <span className="mr-2 text-blue-500">📈</span> Win Rate
                </div>
                <div className={`text-5xl font-extrabold ${profitColor}`}>
                  {winRate}%
                </div>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    className="text-gray-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - winRate / 100)}`}
                    className={`${winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            
            {/* Card 3: Hands Played */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
              <div className="text-gray-400 text-lg font-semibold mb-2 flex items-center">
                <span className="mr-2 text-poker-gold">♠️</span> Hands Played
              </div>
              <div className="text-4xl font-extrabold text-white">
                {userProfile?.hands_played || 0}
              </div>
              <p className="text-gray-500 text-sm mt-1">Total hands recorded in history.</p>
            </div>
          </div>

          {/* Section 3: Detailed Hand History Preview (New Feature) */}
          <div className="pt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="mr-3 text-red-500">♦️</span> Recent Hand History
              </h2>
              <Button
                onClick={() => handleOpenHandHistory()}
                variant="secondary"
                className="text-sm px-4 py-2 hover:bg-poker-gold/20"
              >
                View All Hands
              </Button>
            </div>
            
            {/* Scrollable Hand History Cards */}
            {recentHands.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                    <p className="text-gray-400 text-lg">
                        No recent hands to display. Play a game to start tracking!
                    </p>
                </div>
            ) : (
                <div className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory scrollbar-thin-dark">
                    {recentHands.map((hand) => (
                        <button
                            key={hand.id}
                            onClick={() => handleOpenHandHistory(hand)}
                            className="flex-shrink-0 w-64 p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-poker-gold transition-all duration-200 shadow-md hover:shadow-xl snap-start text-left"
                        >
                            <div className="text-sm font-semibold text-gray-400 mb-1 flex justify-between">
                                <span>{hand.table_name}</span>
                                <span>{hand.time}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                Hand #{hand.id.slice(-4)}
                            </h3>
                            <div className="border-t border-gray-700 pt-2">
                                <span className={`text-lg font-extrabold ${hand.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {hand.profit >= 0 ? '+' : ''}{formatCurrency(hand.profit)}
                                </span>
                                <span className="text-sm text-gray-400 ml-2">({hand.result_text})</span>
                            </div>
                            <div className="text-xs text-blue-400 mt-2">
                                Click to view full hand analysis
                            </div>
                        </button>
                    ))}
                </div>
            )}
          </div>
          
          {/* Section 4: Secondary Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-800">
             <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-blue-500 shadow-md">
                <div className="text-gray-400 text-sm mb-1">Hands Won</div>
                <div className="text-white text-3xl font-bold">{userProfile?.hands_won || 0}</div>
             </div>
             <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-green-500 shadow-md">
                <div className="text-gray-400 text-sm mb-1">Avg Pot Won</div>
                <div className="text-white text-3xl font-bold">{formatCurrency(userProfile?.avg_pot_won || 0)}</div>
             </div>
             <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-yellow-500 shadow-md">
                <div className="text-gray-400 text-sm mb-1">AI Insights Count</div>
                <div className="text-white text-3xl font-bold">--</div> {/* Placeholder */}
             </div>
             <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-red-500 shadow-md">
                <div className="text-gray-400 text-sm mb-1">Last Played</div>
                <div className="text-white text-base font-bold">
                    {userProfile?.last_played ? 
                      new Date(userProfile.last_played).toLocaleDateString() : 
                      'N/A'
                    }
                </div>
             </div>
          </div>

        </div>
      </main>
      
      {/* Hand History Modal - Passes the selected hand if clicked from the preview */}
      <HandHistory
        isOpen={showHandHistory}
        onClose={handleCloseHandHistory}
        initialSelectedHand={selectedHandInModal}
      />
    </div>
  );
};