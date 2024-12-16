import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface KittyPreferences {
  selectedBody: string;
  selectedPattern: string;
  selectedEye: string;
  selectedMouth: string;
  selectedColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    eyeColor: string;
  };
}

export const saveUserPreferences = async (userEmail: string, preferences: KittyPreferences, userId: string) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      email: userEmail,
      preferences,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
};

export const getUserPreferences = async (userEmail: string, userId: string): Promise<KittyPreferences | null> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.preferences as KittyPreferences;
    }
    return null;
  } catch (error) {
    console.error('Error fetching preferences:', error);
    throw error;
  }
};