import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Badge } from 'react-native-paper';
import { Conversation } from '@messageai/shared';
import { formatTimestamp } from '../../utils/dateFormatter';

interface ConversationListItemProps {
  conversation: Conversation;
  displayName: string;
  onPress: () => void;
  unreadCount?: number;
}

export default function ConversationListItem({
  conversation,
  displayName,
  onPress,
  unreadCount = 0,
}: ConversationListItemProps) {
  const truncateMessage = (message: string | null, maxLength: number = 50): string => {
    if (!message) return 'No messages yet';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getAvatarLabel = (name: string): string => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.content}>
        <Avatar.Text 
          size={50} 
          label={getAvatarLabel(displayName)}
          style={styles.avatar}
        />
        
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {conversation.lastMessageTimestamp && (
              <Text variant="bodySmall" style={styles.timestamp}>
                {formatTimestamp(conversation.lastMessageTimestamp)}
              </Text>
            )}
          </View>
          
          <View style={styles.messageRow}>
            <Text 
              variant="bodyMedium" 
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {truncateMessage(conversation.lastMessage)}
            </Text>
            {unreadCount > 0 && (
              <Badge size={20} style={styles.badge}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontWeight: '600',
  },
  timestamp: {
    color: '#666',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#6200ee',
  },
});

