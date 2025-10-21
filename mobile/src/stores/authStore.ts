import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { User } from '@messageai/shared';
import { auth } from '../services/firebase/config';
import { createUserDocument, getUserDocument } from '../services/firestore/usersService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  initializeAuthListener: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getUserDocument(userCredential.user.uid);
          
          if (!userDoc) {
            throw new Error('User document not found');
          }
          
          set({ user: userDoc, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const errorMessage = getAuthErrorMessage(error.code);
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },
      
      signup: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser: User = {
            id: userCredential.user.uid,
            email,
            displayName,
            profilePictureURL: null,
            isOnline: true,
            lastSeen: new Date(),
            fcmToken: null,
            createdAt: new Date(),
          };
          
          await createUserDocument(newUser);
          set({ user: newUser, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const errorMessage = getAuthErrorMessage(error.code);
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },
      
      logout: async () => {
        try {
          await signOut(auth);
          set({ user: null, isAuthenticated: false, error: null });
        } catch (error: any) {
          console.error('Logout error:', error);
          set({ error: 'Failed to logout' });
        }
      },
      
      setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
      
      clearError: () => set({ error: null }),
      
      initializeAuthListener: () => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in with Firebase, fetch their profile
            const userDoc = await getUserDocument(firebaseUser.uid);
            if (userDoc) {
              set({ user: userDoc, isAuthenticated: true, isLoading: false });
            }
          } else {
            // User is signed out
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await SecureStore.getItemAsync(name);
          return value;
        },
        setItem: async (name: string, value: string) => {
          await SecureStore.setItemAsync(name, value);
        },
        removeItem: async (name: string) => {
          await SecureStore.deleteItemAsync(name);
        },
      })),
    }
  )
);

// Helper function to convert Firebase error codes to user-friendly messages
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

