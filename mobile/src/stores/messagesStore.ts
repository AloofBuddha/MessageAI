import { create } from 'zustand';
import { Message } from '@messageai/shared';
import { listenToMessages, sendMessage as sendMessageToFirestore } from '../services/firestore/messagesService';
import { messageRepository } from '../services/sqlite/messageRepository';
import { getNetworkStatus } from '../services/network/networkMonitor';
import { syncManager } from '../services/sync/syncManager';

interface MessagesState {
  messagesByConversation: Record<string, Message[]>;
  isLoading: Record<string, boolean>;
  error: Record<string, string | null>;
  unsubscribers: Record<string, () => void>;
  
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  updateMessageStatus: (localId: string, status: 'sent' | 'delivered' | 'read' | 'failed') => void;
  clearMessages: (conversationId: string) => void;
  clearAllMessages: () => void;
}

// Helper to generate UUID for localId
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messagesByConversation: {},
  isLoading: {},
  error: {},
  unsubscribers: {},
  
  loadMessages: async (conversationId: string) => {
    set((state) => ({
      isLoading: { ...state.isLoading, [conversationId]: true },
      error: { ...state.error, [conversationId]: null },
    }));
    
    try {
      // 1. Load from SQLite cache first (instant UI)
      const cachedMessages = await messageRepository.getByConversation(conversationId);
      
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: cachedMessages,
        },
        isLoading: { ...state.isLoading, [conversationId]: false },
      }));
      
      // Clean up previous listener if exists
      const prevUnsubscribe = get().unsubscribers[conversationId];
      if (prevUnsubscribe) {
        prevUnsubscribe();
      }
      
      // 2. Set up Firestore real-time listener (for sync)
      const unsubscribe = listenToMessages(
        conversationId,
        async (firestoreMessages) => {
          // Replace cache with Firestore data (ensures cache matches server exactly)
          await messageRepository.replaceForConversation(conversationId, firestoreMessages);
          
          // Update state
          set((state) => ({
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: firestoreMessages,
            },
          }));
        },
        (error) => {
          console.error('Error loading messages from Firestore:', error);
          set((state) => ({
            error: { ...state.error, [conversationId]: error.message },
          }));
        }
      );
      
      set((state) => ({
        unsubscribers: {
          ...state.unsubscribers,
          [conversationId]: unsubscribe,
        },
      }));
    } catch (error: any) {
      console.error('Error loading messages:', error);
      set((state) => ({
        error: { ...state.error, [conversationId]: error.message },
        isLoading: { ...state.isLoading, [conversationId]: false },
      }));
    }
  },
  
  sendMessage: async (conversationId: string, senderId: string, content: string) => {
    const localId = generateUUID();
    const networkStatus = getNetworkStatus();
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: localId,
      conversationId,
      senderId,
      type: 'text',
      content,
      imageURL: null,
      timestamp: new Date(),
      status: 'sending',
      deliveredTo: [],
      readBy: [],
      localId,
    };
    
    // Optimistic update - add message immediately
    set((state) => {
      const existingMessages = state.messagesByConversation[conversationId] || [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...existingMessages, optimisticMessage],
        },
      };
    });
    
    // Cache the optimistic message to SQLite
    await messageRepository.upsert(optimisticMessage);
    
    // Check network status - consider offline if not connected OR no internet reachable
    const isOffline = !networkStatus.isConnected || networkStatus.isInternetReachable === false;
    
    if (isOffline) {
      console.log('📴 Offline - adding message to pending queue');
      
      // Add to pending queue
      await syncManager.addToPendingQueue(localId, conversationId, 'text', content);
      
      // Message will be sent when we come back online
      return;
    }
    
    // Send to Firestore
    try {
      await sendMessageToFirestore(conversationId, senderId, content, 'text', null, localId);
      // The real-time listener will update the message with server data
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      // Update message status to failed
      set((state) => {
        const messages = state.messagesByConversation[conversationId] || [];
        const updatedMessages = messages.map((msg) =>
          msg.localId === localId ? { ...msg, status: 'failed' as const } : msg
        );
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: updatedMessages,
          },
        };
      });
      
      // Also update in SQLite
      await messageRepository.updateStatus(localId, 'failed');
      
      throw error;
    }
  },
  
  updateMessageStatus: (localId: string, status: 'sent' | 'delivered' | 'read' | 'failed') => {
    set((state) => {
      const updatedMessagesByConversation = { ...state.messagesByConversation };
      
      // Find and update the message across all conversations
      Object.keys(updatedMessagesByConversation).forEach((conversationId) => {
        const messages = updatedMessagesByConversation[conversationId];
        const updatedMessages = messages.map((msg) =>
          msg.localId === localId ? { ...msg, status } : msg
        );
        updatedMessagesByConversation[conversationId] = updatedMessages;
      });
      
      return {
        messagesByConversation: updatedMessagesByConversation,
      };
    });
    
    // Also update in SQLite
    messageRepository.updateStatus(localId, status);
  },
  
  clearMessages: (conversationId: string) => {
    // Clean up listener
    const unsubscribe = get().unsubscribers[conversationId];
    if (unsubscribe) {
      unsubscribe();
    }
    
    set((state) => {
      const newMessagesByConversation = { ...state.messagesByConversation };
      delete newMessagesByConversation[conversationId];
      
      const newUnsubscribers = { ...state.unsubscribers };
      delete newUnsubscribers[conversationId];
      
      const newIsLoading = { ...state.isLoading };
      delete newIsLoading[conversationId];
      
      const newError = { ...state.error };
      delete newError[conversationId];
      
      return {
        messagesByConversation: newMessagesByConversation,
        unsubscribers: newUnsubscribers,
        isLoading: newIsLoading,
        error: newError,
      };
    });
  },
  
  clearAllMessages: () => {
    // Clean up all listeners
    const unsubscribers = get().unsubscribers;
    Object.values(unsubscribers).forEach((unsubscribe) => unsubscribe());
    
    set({
      messagesByConversation: {},
      isLoading: {},
      error: {},
      unsubscribers: {},
    });
  },
}));

