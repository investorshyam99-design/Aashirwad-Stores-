import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isInitializing: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const getGuestId = () => {
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('guestId', guestId);
  }
  return guestId;
};

export const useAuthStore = create<AuthState>((set) => {
  let isListening = false;

  const initAuthListener = () => {
    if (isListening) return;
    isListening = true;
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        let isAdmin = user.email === 'investorshyam99@gmail.com';
        try {
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            isAdmin = true;
          }
        } catch (e) {
          // Ignore missing permissions if rules are not deployed yet
        }
        set({ user, isAdmin, isInitializing: false });
      } else {
        set({ user: null, isAdmin: false, isInitializing: false });
      }
    });
  };

  initAuthListener();

  return {
    user: null,
    isAdmin: false,
    isInitializing: true,
    login: async () => {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
          console.error("Login failed:", error);
        }
      }
    },
    logout: async () => {
      try {
        await firebaseSignOut(auth);
      } catch (error: any) {
        console.error("Logout failed:", error);
      }
    }
  };
});
