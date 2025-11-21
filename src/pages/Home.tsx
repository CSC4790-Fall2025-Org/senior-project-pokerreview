import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';
import { AuthModal } from '../components/auth/AuthModal';

export const Home: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'login' | 'register';
  }>({
    isOpen: false,
    mode: 'login'
  });

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthModal({ isOpen: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, mode: 'login' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-poker-green">
      {/* Header */}
      <header className="p-6">
        <nav className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="text-2xl font-bold text-poker-gold">
            Poker Review
          </div>
          
          <div className="space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-300">Welcome, {user?.username}!</span>
                <Button onClick={logout} variant="secondary">
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  onClick={() => openAuthModal('login')}
                  variant="secondary"
                >
                  Sign In
                </Button>
                <Button onClick={() => openAuthModal('register')}>
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex items-center justify-center min-h-[80vh] px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Master Your{' '}
            <span className="text-poker-gold">Poker Game</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Play poker with friends and get AI-powered analysis to improve your strategy. 
            Learn from every hand with detailed reviews and optimal play suggestions.
          </p>
          
          <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
            {isAuthenticated ? (
              <>
                <Button className="w-full md:w-auto text-lg px-8 py-3">
                  Create Game
                </Button>
                <Button variant="secondary" className="w-full md:w-auto text-lg px-8 py-3">
                  Join Game
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => openAuthModal('register')}
                  className="w-full md:w-auto text-lg px-8 py-3"
                >
                  Get Started Free
                </Button>
                <Button 
                  onClick={() => openAuthModal('login')}
                  variant="secondary" 
                  className="w-full md:w-auto text-lg px-8 py-3"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why Choose PokerAI Pro?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-poker-gold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-gray-300">
                Get real-time suggestions and post-game analysis powered by advanced AI
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-poker-gold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Play with Friends
              </h3>
              <p className="text-gray-300">
                Create private tables and invite your friends for fun learning sessions
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-poker-gold w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Track Progress
              </h3>
              <p className="text-gray-300">
                Monitor your improvement over time with detailed statistics and insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        defaultMode={authModal.mode}
      />
    </div>
  );
};