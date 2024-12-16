import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import MenuScreen from './components/MenuScreen';
import { useAuth } from './contexts/AuthContext';
import CryptoKittyDesigner from './components/CryptoKittyDesigner';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'designer'>('menu');
  const [isKittyActive, setKittyActive] = useState(false);

  // Check if kitty can be activated on current tab
  const checkTabCompatibility = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.startsWith('chrome://') || tab?.url?.startsWith('https://chrome.google.com/webstore')) {
        throw new Error('Cannot activate on Chrome pages');
      }
      
      // Check if background script is alive
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_ALIVE' });
      return response?.alive === true;
    } catch (err) {
      console.error('Tab compatibility check failed:', err);
      return false;
    }
  };

  const activateKitty = async (kittyData: any) => {
    const isCompatible = await checkTabCompatibility();
    if (!isCompatible) {
      console.error('Tab not compatible for kitty activation');
      return;
    }

    try {
      await chrome.runtime.sendMessage({ 
        type: 'ACTIVATE_KITTY',
        kittyData 
      });
      setKittyActive(true);
      window.close(); // Close popup after activation
    } catch (err) {
      console.error('Failed to activate kitty:', err);
    }
  };

  const deactivateKitty = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'DEACTIVATE_KITTY' });
      setKittyActive(false);
    } catch (err) {
      console.error('Failed to deactivate kitty:', err);
    }
  };

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="h-[600px] bg-gray-50 flex flex-col overflow-hidden">
{currentScreen === 'menu' ? (
  <MenuScreen 
    onCustomize={() => setCurrentScreen('designer')}
    onActivate={activateKitty}
    onDeactivate={deactivateKitty}
    isKittyActive={isKittyActive}
  />
) : (
  <CryptoKittyDesigner onBack={() => setCurrentScreen('menu')} />
)}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;