import React, { createContext, useContext, useState, useEffect } from 'react';
import { Magic } from 'magic-sdk';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  user: string | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Magic instance
const magic = new Magic(process.env.REACT_APP_MAGIC_PUBLISHABLE_KEY as string);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create or retrieve user document in Firebase
  const createOrGetUser = async (email: string) => {
    // Create a deterministic but unique ID from email
    const uid = btoa(email).replace(/[/+=]/g, '');
    const userRef = doc(db, 'users', uid);
    
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // Create new user document if it doesn't exist
      await setDoc(userRef, {
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    return uid;
  };

  useEffect(() => {
    const quickAuth = async () => {
      try {
        const { cachedUser, cachedUserId } = await chrome.storage.local.get([
          'cachedUser',
          'cachedUserId'
        ]);

        if (cachedUser && cachedUserId) {
          setUser(cachedUser);
          setUserId(cachedUserId);
          setLoading(false);
          
          // Verify with Magic in background
          checkUser();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking cached auth:', error);
        setLoading(false);
      }
    };

    quickAuth();
  }, []);

  const checkUser = async () => {
    try {
      const isLoggedIn = await magic.user.isLoggedIn();
      
      if (isLoggedIn) {
        const { email } = await magic.user.getMetadata();
        if (email) {
          const uid = await createOrGetUser(email);
          setUser(email);
          setUserId(uid);
          
          // Cache the auth state
          await chrome.storage.local.set({
            cachedUser: email,
            cachedUserId: uid
          });
        }
      } else {
        // Clear cache if not logged in
        await chrome.storage.local.remove(['cachedUser', 'cachedUserId']);
        setUser(null);
        setUserId(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      await logout();
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkUser();
  }, []);

  const login = async (email: string) => {
    try {
      setLoading(true);
      
      await magic.auth.loginWithEmailOTP({ email });
      const uid = await createOrGetUser(email);
      
      // Cache immediately after successful login
      await chrome.storage.local.set({
        cachedUser: email,
        cachedUserId: uid
      });
      
      setUser(email);
      setUserId(uid);

      // ... rest of login logic
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

// AuthContext.tsx - Update the logout function
const logout = async () => {
  try {
    setLoading(true);
    // Immediately clear state
    setUser(null);
    setUserId(null);
    
    // Clear local storage immediately
    await chrome.storage.local.remove(['cachedUser', 'cachedUserId']);
    
    // Then handle Magic logout in the background
    await magic.user.logout();
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if Magic logout fails, we've already cleared local state
  } finally {
    setLoading(false);
  }
};

  // Initialize auth state from extension storage
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const { authUser, userId: storedUserId } = await chrome.storage.local.get([
          'authUser',
          'userId'
        ]);

        if (authUser) {
          setUser(authUser);
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('Error initializing from storage:', error);
      }
    };

    initializeFromStorage();
  }, []);

  // Context value
  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    userId
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};