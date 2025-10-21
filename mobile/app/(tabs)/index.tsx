import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, FAB, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useConversationsStore } from '../../src/stores/conversationsStore';
import ConversationListItem from '../../src/components/molecules/ConversationListItem';
import { getConversationDisplayName } from '../../src/services/firestore/conversationsService';
import OfflineIndicator from '../../src/components/atoms/OfflineIndicator';

export default function ConversationsScreen() {
  const { user } = useAuthStore();
  const { conversations, isLoading, loadConversations, clearConversations } = useConversationsStore();
  const router = useRouter();
  
  useEffect(() => {
    if (user) {
      loadConversations(user.id);
    }
    
    // Cleanup on unmount
    return () => {
      clearConversations();
    };
  }, [user]);
  
  const handleConversationPress = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };
  
  const handleNewConversation = () => {
    // Placeholder for now - will be implemented in later stories
    console.log('New conversation button pressed');
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="message-text-outline" size={80} color="#ccc" />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No conversations yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Start a new conversation to get started
      </Text>
    </View>
  );
  
  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading conversations...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // Create a simple users map - in a real app, you'd fetch user details
          const usersMap = new Map();
          item.participants.forEach(participantId => {
            if (participantId !== user?.id) {
              usersMap.set(participantId, { displayName: 'User' });
            }
          });
          
          const displayName = getConversationDisplayName(item, user?.id || '', usersMap);
          
          return (
            <ConversationListItem
              conversation={item}
              displayName={displayName}
              onPress={() => handleConversationPress(item.id)}
              unreadCount={0} // Placeholder - will be implemented in later stories
            />
          );
        }}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
      />
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleNewConversation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
});

