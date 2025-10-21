import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { useMessagesStore } from '../../src/stores/messagesStore';
import MessageBubble from '../../src/components/molecules/MessageBubble';
import ChatInput from '../../src/components/molecules/ChatInput';
import OfflineIndicator from '../../src/components/atoms/OfflineIndicator';
import { markAsRead } from '../../src/services/firestore/messagesService';
import { DebouncedBatch } from '../../src/utils/debounce';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  
  const { user } = useAuthStore();
  const { messagesByConversation, isLoading, loadMessages, sendMessage, retryMessage, clearMessages } = useMessagesStore();
  
  const messages = messagesByConversation[conversationId] || [];
  const loading = isLoading[conversationId];
  
  const flatListRef = useRef<FlatList>(null);
  
  // Debounced batch for read receipts - accumulates message IDs and flushes after 1s
  const readReceiptBatch = useMemo(() => {
    if (!user || !conversationId) return null;
    
    return new DebouncedBatch<string>(
      async (messageIds: string[]) => {
        try {
          await markAsRead(conversationId, messageIds, user.id);
        } catch (err) {
          console.error('Failed to mark messages as read:', err);
        }
      },
      1000 // 1 second debounce
    );
  }, [conversationId, user]);
  
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
    
    return () => {
      if (conversationId) {
        // Flush any pending read receipts before cleanup
        readReceiptBatch?.flush();
        clearMessages(conversationId);
      }
    };
  }, [conversationId]);
  
  // Mark messages as read when screen is focused (debounced)
  useFocusEffect(
    useCallback(() => {
      if (!user || !conversationId || messages.length === 0 || !readReceiptBatch) return;
      
      // Find messages that haven't been read by current user
      const unreadIds = messages
        .filter(m => m.senderId !== user.id && !m.readBy.includes(user.id))
        .map(m => m.id);
      
      // Add to debounced batch instead of calling immediately
      unreadIds.forEach(id => readReceiptBatch.add(id));
      
      return () => {
        // Flush on unmount to ensure receipts are sent
        readReceiptBatch.flush();
      };
    }, [conversationId, user, messages, readReceiptBatch])
  );
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);
  
  const handleSend = async (content: string) => {
    if (user && conversationId) {
      try {
        await sendMessage(conversationId, user.id, content);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };
  
  const handleRetry = async (localId: string) => {
    if (conversationId) {
      try {
        await retryMessage(conversationId, localId);
      } catch (error) {
        console.error('Failed to retry message:', error);
      }
    }
  };
  
  if (loading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading messages...
        </Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineIndicator />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()} // Reverse for inverted list
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwnMessage={item.senderId === user?.id}
                onRetry={item.status === 'failed' ? () => handleRetry(item.localId!) : undefined}
              />
            )}
            inverted
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            }}
          />
        )}
        
        <ChatInput onSend={handleSend} disabled={!user} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  messagesList: {
    paddingVertical: 8,
  },
});


