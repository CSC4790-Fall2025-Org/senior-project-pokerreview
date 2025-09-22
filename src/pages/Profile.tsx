import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserService, UserProfile } from '../services/api/user';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const Profile: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  // Load user profile with stats on component mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const response = await UserService.getProfile();
      if (response.success && response.user) {
        setUserProfile(response.user);
        setFormData({
          username: response.user.username,
          email: response.user.email,
        });
      } else {
        setError(response.error || 'Failed to load profile');
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await UserService.updateProfile(formData);
      
      if (response.success && response.user) {
        setUserProfile(response.user);
        setIsEditing(false);
        // You might also want to update the auth store with the new user info
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

  const goBack = () => {
    navigate('/dashboard');
  };

  if (isLoading && !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-poker-green flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  const displayUser = userProfile || user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-poker-green">
      {/* Header */}
      <header className="p-6 border-b border-gray-700">
        <nav className="flex justify-between items-center max-w-4xl mx-auto">
          <button
            onClick={goBack}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="text-2xl font-bold text-poker-gold">
            PokerAI Pro
          </div>
          <div></div> {/* Spacer for flex layout */}
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {/* Profile Header */}
          <div className="flex items-center mb-8">
            <div className="w-20 h-20 bg-poker-gold rounded-full flex items-center justify-center mr-6">
              <span className="text-gray-900 font-bold text-2xl">
                {displayUser?.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{displayUser?.username}</h1>
              <p className="text-gray-400">Member since {new Date((userProfile?.created_at || user?.createdAt) || '').toLocaleDateString()}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Profile Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                {!isEditing && (
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                    className="text-sm px-4 py-2"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <Input
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                />

                {isEditing && (
                  <div className="flex space-x-4 pt-4">
                    <Button 
                      onClick={handleSave} 
                      className="flex-1"
                      isLoading={isLoading}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      variant="secondary" 
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Game Statistics */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Game Statistics</h2>
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Games</span>
                    <span className="text-white font-semibold">{userProfile?.games_played || 0}</span>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Hands Won</span>
                    <span className="text-green-400 font-semibold">{userProfile?.hands_won || 0}</span>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="text-poker-gold font-semibold">{userProfile?.win_rate || 0}%</span>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Winnings</span>
                    <span className="text-white font-semibold">${userProfile?.total_winnings || 0}</span>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Hands Played</span>
                    <span className="text-white font-semibold">{userProfile?.hands_played || 0}</span>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Avg Pot Won</span>
                    <span className="text-white font-semibold">${userProfile?.avg_pot_won || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
            <div className="bg-gray-900 rounded-lg p-6">
              {userProfile?.last_played ? (
                <p className="text-gray-400">
                  Last played: {new Date(userProfile.last_played).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-gray-400 text-center">
                  No recent activity. Join a game to start playing!
                </p>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6">Account Actions</h2>
            <div className="flex space-x-4">
              <Button
                onClick={logout}
                variant="secondary"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};