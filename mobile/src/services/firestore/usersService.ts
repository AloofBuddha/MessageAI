import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '@messageai/shared';
import { firestore } from '../firebase/config';

/**
 * Create a new user document in Firestore
 */
export async function createUserDocument(user: User): Promise<void> {
  try {
    const userRef = doc(firestore, 'users', user.id);
    
    // Convert User object to Firestore-compatible format
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      profilePictureURL: user.profilePictureURL,
      isOnline: user.isOnline,
      lastSeen: serverTimestamp(),
      fcmToken: user.fcmToken,
      createdAt: serverTimestamp(),
    });
    
    console.log('User document created successfully:', user.id);
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

/**
 * Get a user document from Firestore by ID
 */
export async function getUserDocument(userId: string): Promise<User | null> {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('No user document found for:', userId);
      return null;
    }
    
    const data = userSnap.data();
    
    // Convert Firestore data to User object
    const user: User = {
      id: userSnap.id,
      email: data.email,
      displayName: data.displayName,
      profilePictureURL: data.profilePictureURL || null,
      isOnline: data.isOnline || false,
      lastSeen: data.lastSeen?.toDate() || new Date(),
      fcmToken: data.fcmToken || null,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
    
    return user;
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
}

/**
 * Update user's online presence status
 */
export async function updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
  try {
    const userRef = doc(firestore, 'users', userId);
    
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
    });
    
    console.log(`User presence updated: ${userId} - ${isOnline ? 'online' : 'offline'}`);
  } catch (error) {
    console.error('Error updating user presence:', error);
    throw error;
  }
}

/**
 * Update user's FCM token for push notifications
 */
export async function updateUserFCMToken(userId: string, fcmToken: string): Promise<void> {
  try {
    const userRef = doc(firestore, 'users', userId);
    
    await updateDoc(userRef, {
      fcmToken,
    });
    
    console.log('User FCM token updated:', userId);
  } catch (error) {
    console.error('Error updating FCM token:', error);
    throw error;
  }
}

