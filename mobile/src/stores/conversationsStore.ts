import { create } from 'zustand';
import { Conversation } from '@messageai/shared';
import { listenToUserConversations, createConversation } from '../services/firestore/conversationsService';

interface ConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  loadConversations: (userId: string) => void;
  createNewConversation: (participants: string[], type: 'direct' | 'group', createdBy: string, name?: string) => Promise<string>;
  clearConversations: () => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  isLoading: false,
  error: null,
  unsubscribe: null,
  
  loadConversations: (userId: string) => {
    set({ isLoading: true, error: null });
    
    // Clean up previous listener if exists
    const prevUnsubscribe = get().unsubscribe;
    if (prevUnsubscribe) {
      prevUnsubscribe();
    }
    
    // Set up new real-time listener
    const unsubscribe = listenToUserConversations(
      userId,
      (conversations) => {
        set({ conversations, isLoading: false });
      },
      (error) => {
        console.error('Error loading conversations:', error);
        set({ error: error.message, isLoading: false });
      }
    );
    
    set({ unsubscribe });
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

