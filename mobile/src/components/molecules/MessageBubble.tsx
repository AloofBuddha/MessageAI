import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Message } from '@messageai/shared';
import { formatMessageTime } from '../../utils/dateFormatter';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />;
      case 'sent':
        return <MaterialCommunityIcons name="check" size={14} color="#999" />;
      case 'delivered':
        return <MaterialCommunityIcons name="check-all" size={14} color="#999" />;
      case 'read':
        return <MaterialCommunityIcons name="check-all" size={14} color="#6200ee" />;
      case 'failed':
        return <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#f44336" />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
        <Text
          variant="bodyMedium"
          style={[styles.content, isOwnMessage ? styles.ownContent : styles.otherContent]}
        >
          {message.content}
        </Text>
        
        <View style={styles.footer}>
          <Text
            variant="bodySmall"
            style={[styles.timestamp, isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp]}
          >
            {formatMessageTime(message.timestamp)}
          </Text>
          {isOwnMessage && <View style={styles.statusIcon}>{getStatusIcon()}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#6200ee',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  content: {
    marginBottom: 4,
  },
  ownContent: {
    color: '#fff',
  },
  otherContent: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#666',
  },
  statusIcon: {
    marginLeft: 4,
  },
});

