import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './Alert';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullPage, setIsFullPage] = useState(false);
  const { login, logout, user, isAuthenticated } = useAuth();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setIsFullPage(window.innerWidth > 400);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await login(email);
      setLoginSuccess(true);
      
      // Only handle auto-close in the full page auth view
      if (window.location.search.includes('auth=true')) {
        // Wait 5 seconds before closing
        setTimeout(() => {
          try {
            window.close();
            // Fallback for browsers that block window.close()
            window.location.href = chrome.runtime.getURL('index.html');
          } catch (err) {
            console.error('Error closing window:', err);
          }
        }, 5000);
      }
    } catch (err) {
      setError('Failed to log in. Please check your email and try again.');
      setLoginSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuth = () => {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('index.html?auth=true'),
      active: true
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error opening auth tab:', chrome.runtime.lastError);
        return;
      }
      window.close();
    });
  };

  const handleLogout = async () => {
    try {
      setLogoutError(null);
      await logout();
    } catch (err) {
      const errorMessage = 'Failed to sign out. Please try again.';
      setLogoutError(errorMessage);
      console.error('Error logging out:', err);
    }
  };

  const SuccessMessage = () => (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center p-6 max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Successfully Logged In!
        </h3>
        <p className="text-gray-600 mb-6">
          You can now continue using the CryptoKitty Designer in your extension.
          This window will close in a few seconds.
        </p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );

  // Show success message immediately after successful login in full page mode
  if (loginSuccess && window.location.search.includes('auth=true')) {
    return <SuccessMessage />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="w-full px-4 py-2 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
            <Mail className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-600 truncate max-w-[200px]">{user}</span>
        </div>
        <div className="flex items-center gap-2">
          {logoutError && (
            <span className="text-xs text-red-500">{logoutError}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!isFullPage) {
    return (
      <div className="fixed inset-0 w-[400px] h-[600px] flex flex-col items-center justify-center bg-white">
        <div className="w-full max-w-[320px] flex flex-col items-center px-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-8">
            <Mail className="h-10 w-10 text-purple-600" />
          </div>

          <div className="text-center space-y-3 mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome to CryptoKitty Designer
            </h1>
            <p className="text-gray-600">
              Login to start creating your unique kitties
            </p>
          </div>

          <button
            onClick={handleOpenAuth}
            className="w-full flex items-center justify-center gap-3 bg-purple-600 
              text-white hover:bg-purple-700 py-4 rounded-2xl font-medium 
              transition-all duration-300 hover:shadow-lg"
          >
            <Mail className="h-5 w-5" />
            <span>Login with Email</span>
          </button>

          <p className="text-sm text-gray-500 mt-6">
            Secure, passwordless login
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="fixed bottom-4 mx-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 mx-auto">
          <div className="text-left space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create Your Kitty
            </h1>
            <p className="text-gray-600">
              Sign in with magic link to start designing
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-base font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 rounded-2xl focus:outline-none 
                    focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
                  placeholder="you@example.com"
                  required
                />
                <Mail className="absolute right-4 top-4 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white
                py-4 px-4 rounded-2xl font-medium transition-all hover:bg-purple-700
                disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            We'll send you a magic link for password-free sign in
          </p>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;