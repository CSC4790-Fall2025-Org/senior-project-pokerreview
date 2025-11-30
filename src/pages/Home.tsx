import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';
import { AuthModal } from '../components/auth/AuthModal';

export const Home: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
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

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-poker-gold opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 -left-40 w-96 h-96 bg-green-600 opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-blue-600 opacity-10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-gray-800 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-300">
              <span className="text-2xl transform -rotate-12">♠️</span>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-poker-gold via-yellow-400 to-poker-gold bg-clip-text text-transparent">
              Poker Review
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-300 hidden md:block">Welcome, <span className="text-poker-gold font-semibold">{user?.username}</span>!</span>
                <Button onClick={goToDashboard} className="bg-gradient-to-r from-green-600 to-green-700">
                  Dashboard
                </Button>
                <Button onClick={logout} variant="secondary">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => openAuthModal('login')}
                  variant="secondary"
                  className="hidden md:block"
                >
                  Sign In
                </Button>
                <Button onClick={() => openAuthModal('register')} className="bg-gradient-to-r from-poker-gold to-yellow-600">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          {/* Hero Content with Visual */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            {/* Left Side - Text Content */}
            <div className="text-center md:text-left">
              <div className="inline-block mb-6 px-6 py-2 bg-poker-gold bg-opacity-10 border border-poker-gold rounded-full">
                <span className="text-poker-gold font-semibold">🎯 Master the Art of Poker</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Play Smart.
                <br />
                <span className="bg-gradient-to-r from-poker-gold via-yellow-400 to-poker-gold bg-clip-text text-transparent">
                  Win Bigger.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
                The ultimate poker platform combining real-time gameplay with AI-powered analysis. 
                Every hand is a lesson, every game makes you better.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
                {isAuthenticated ? (
                  <Button 
                    onClick={goToDashboard}
                    className="w-full sm:w-auto text-lg px-10 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-2xl hover:shadow-green-900/50 transform hover:scale-105 transition-all"
                  >
                    <span className="flex items-center">
                      Go to Dashboard
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => openAuthModal('register')}
                      className="w-full sm:w-auto text-lg px-10 py-4 bg-gradient-to-r from-poker-gold to-yellow-600 hover:from-yellow-600 hover:to-poker-gold shadow-2xl hover:shadow-yellow-900/50 transform hover:scale-105 transition-all"
                    >
                      <span className="flex items-center">
                        Start Playing Free
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </Button>
                    <Button 
                      onClick={() => openAuthModal('login')}
                      variant="secondary" 
                      className="w-full sm:w-auto text-lg px-10 py-4 border-2 border-gray-600 hover:border-poker-gold"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="text-center md:text-left">
                  <div className="text-3xl font-bold text-poker-gold mb-1">Real-Time</div>
                  <div className="text-gray-400 text-sm">Gameplay</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-3xl font-bold text-poker-gold mb-1">AI Powered</div>
                  <div className="text-gray-400 text-sm">Analysis</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-3xl font-bold text-poker-gold mb-1">24/7</div>
                  <div className="text-gray-400 text-sm">Available</div>
                </div>
              </div>
            </div>

            {/* Right Side - Visual Cards Display */}
            <div className="relative hidden md:block">
              {/* Poker Table Background */}
              <div className="relative w-full h-[500px] bg-gradient-to-br from-green-700 to-green-900 rounded-[50%] shadow-2xl border-8 border-yellow-700 flex items-center justify-center">
                <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-transparent to-black opacity-20"></div>
                
                {/* Center Pot Display */}
                <div className="relative z-10 text-center">
                  <div className="bg-gray-900 bg-opacity-80 rounded-2xl px-8 py-6 border-2 border-poker-gold shadow-xl">
                    <div className="text-poker-gold text-sm font-semibold mb-2">CURRENT POT</div>
                    <div className="text-white text-4xl font-bold">$2,450</div>
                  </div>
                </div>

                {/* Floating Cards - Top */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 flex gap-2 animate-float">
                  <img src="/cards/As.svg" alt="Ace of Spades" className="w-16 h-24 rounded-lg shadow-2xl transform -rotate-12 hover:rotate-0 transition-transform" />
                  <img src="/cards/Ks.svg" alt="King of Spades" className="w-16 h-24 rounded-lg shadow-2xl transform rotate-12 hover:rotate-0 transition-transform" />
                </div>

                {/* Floating Cards - Left */}
                <div className="absolute left-8 top-1/2 transform -translate-y-1/2 animate-float-delayed">
                  <img src="/cards/Qh.svg" alt="Queen of Hearts" className="w-16 h-24 rounded-lg shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform" />
                </div>

                {/* Floating Cards - Right */}
                <div className="absolute right-8 top-1/2 transform -translate-y-1/2 animate-float-delayed-2">
                  <img src="/cards/Jd.svg" alt="Jack of Diamonds" className="w-16 h-24 rounded-lg shadow-2xl transform rotate-6 hover:rotate-0 transition-transform" />
                </div>

                {/* Floating Cards - Bottom Left */}
                <div className="absolute bottom-16 left-20 flex gap-2 animate-float">
                  <img src="/cards/10c.svg" alt="10 of Clubs" className="w-16 h-24 rounded-lg shadow-2xl transform rotate-12 hover:rotate-0 transition-transform" />
                </div>

                {/* Floating Cards - Bottom Right */}
                <div className="absolute bottom-16 right-20 flex gap-2 animate-float-delayed">
                  <img src="/cards/9h.svg" alt="9 of Hearts" className="w-16 h-24 rounded-lg shadow-2xl transform -rotate-12 hover:rotate-0 transition-transform" />
                </div>

                {/* Poker Chips */}
               {/* Poker Chips - Positioned near their respective cards */}
                {/* Gold chip - near top cards (center) */}
                <div
                  className="absolute top-36 w-12 h-12 rounded-full bg-gradient-to-br from-poker-gold to-yellow-600 border-4 border-white shadow-xl animate-bounce-slow"
                  style={{ left: "calc(50% + 50px)" }}
                ></div>
                {/* Red chip - near left card */}
                <div className="absolute bottom-24 left-12 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-4 border-white shadow-xl animate-bounce-slow delay-300"></div>

                {/* Blue chip - near right card */}
                <div
                  className="absolute right-8 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-4 border-white shadow-xl animate-bounce-slow delay-500"
                  style={{ top: "calc(50% + 80px)" }}   // ← increase this number to move farther down
                ></div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-poker-gold transition-all duration-300 hover:shadow-2xl hover:shadow-poker-gold/20 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-poker-gold to-yellow-600 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🎯</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  AI-Powered Analysis
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Get instant feedback on your plays with advanced AI that analyzes optimal strategy, pot odds, and decision-making in real-time.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-green-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-900/20 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🎮</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Real-Time Multiplayer
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Join live tables with players worldwide. Experience smooth, lag-free gameplay with our advanced WebSocket technology.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Detailed Hand History
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Review every decision with comprehensive hand replays. Learn from mistakes and perfect your strategy over time.
                </p>
              </div>
            </div>
          </div>

          {/* Demo Preview Section */}
          <div className="my-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-12 border border-gray-700 overflow-hidden">
            <h2 className="text-4xl font-bold text-center text-white mb-4">
              See It In Action
            </h2>
            <p className="text-center text-gray-400 mb-12 text-lg">Live poker table with real-time updates</p>
            
            {/* Mock Table Preview */}
            <div className="relative max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-3xl p-8 shadow-2xl border-4 border-yellow-700">
                {/* Community Cards */}
                <div className="flex justify-center gap-3 mb-8">
                  <img src="/cards/Ah.svg" alt="Ace" className="w-20 h-28 rounded-lg shadow-xl" />
                  <img src="/cards/Kd.svg" alt="King" className="w-20 h-28 rounded-lg shadow-xl" />
                  <img src="/cards/Qc.svg" alt="Queen" className="w-20 h-28 rounded-lg shadow-xl" />
                  <img src="/cards/Js.svg" alt="Jack" className="w-20 h-28 rounded-lg shadow-xl" />
                  <img src="/cards/10h.svg" alt="10" className="w-20 h-28 rounded-lg shadow-xl" />
                </div>
                
                {/* Pot Display */}
                <div className="text-center mb-8">
                  <div className="inline-block bg-gray-900 bg-opacity-80 rounded-xl px-8 py-4 border-2 border-poker-gold">
                    <div className="text-poker-gold text-sm font-semibold mb-1">POT</div>
                    <div className="text-white text-3xl font-bold">$1,250</div>
                  </div>
                </div>
                
                {/* Player Positions Preview */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-900 bg-opacity-60 rounded-xl p-4 border border-gray-700 text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-full mx-auto mb-2 flex items-center justify-center text-xl">
                        ♠
                      </div>
                      <div className="text-white font-semibold text-sm">Player {i}</div>
                      <div className="text-poker-gold text-xs">$500</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Glowing effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-poker-gold to-green-600 opacity-20 blur-3xl -z-10"></div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-12 border border-gray-700">
            <h2 className="text-4xl font-bold text-center text-white mb-4">
              How It Works
            </h2>
            <p className="text-center text-gray-400 mb-12 text-lg">Three simple steps to start improving your game</p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-poker-gold to-yellow-600 rounded-full flex items-center justify-center text-3xl font-bold text-gray-900 mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Join a Table</h3>
                <p className="text-gray-300">Choose from multiple tables with different stake levels and player counts</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Play Your Game</h3>
                <p className="text-gray-300">Enjoy smooth, real-time poker with intuitive controls and beautiful design</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Learn & Improve</h3>
                <p className="text-gray-300">Review AI analysis and hand history to continuously improve your skills</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-gradient-to-r from-poker-gold via-yellow-400 to-poker-gold p-1 rounded-3xl">
              <div className="bg-gray-900 rounded-3xl px-12 py-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Level Up Your Game?
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Join thousands of players improving their poker skills every day
                </p>
                {!isAuthenticated && (
                  <Button 
                    onClick={() => openAuthModal('register')}
                    className="text-lg px-10 py-4 bg-gradient-to-r from-poker-gold to-yellow-600 hover:from-yellow-600 hover:to-poker-gold shadow-2xl"
                  >
                    Get Started Now - It's Free
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        defaultMode={authModal.mode}
      />
    </div>
  );
};