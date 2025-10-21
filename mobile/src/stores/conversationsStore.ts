import { create } from 'zustand';
import { Conversation } from '@messageai/shared';
import { listenToUserConversations, createConversation } from '../services/firestore/conversationsService';
import { conversationRepository } from '../services/sqlite/conversationRepository';

interface ConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  loadConversations: (userId: string) => Promise<void>;
  createNewConversation: (participants: string[], type: 'direct' | 'group', createdBy: string, name?: string) => Promise<string>;
  clearConversations: () => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  isLoading: false,
  error: null,
  unsubscribe: null,
  
  loadConversations: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // 1. Load from SQLite cache first (instant UI)
      const cachedConversations = await conversationRepository.getForUser(userId);
      
      set({ conversations: cachedConversations, isLoading: false });
      
      // Clean up previous listener if exists
      const prevUnsubscribe = get().unsubscribe;
      if (prevUnsubscribe) {
        prevUnsubscribe();
      }
      
      // 2. Set up Firestore real-time listener (for sync)
      const unsubscribe = listenToUserConversations(
        userId,
        async (firestoreConversations) => {
          // Cache to SQLite
          await conversationRepository.bulkUpsert(firestoreConversations);
          
          // Update state
          set({ conversations: firestoreConversations });
        },
        (error) => {
          console.error('Error loading conversations from Firestore:', error);
          set({ error: error.message });
        }
      );
      
      set({ unsubscribe });
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      set({ error: error.message, isLoading: false });
    }
  },
  
  createNewConversation: async (participants, type, createdBy, name) => {
    try {
      const conversationId = await createConversation(participants, type, createdBy, name);
      return conversationId;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  clearConversations: () => {
    // Clean up listener
    const unsubscribe = get().unsubscribe;
    if (unsubscribe) {
      unsubscribe();
    }
    
    set({ 
      conversations: [], 
      isLoading: false, 
      error: null, 
      unsubscribe: null 
    });
  },
}));

