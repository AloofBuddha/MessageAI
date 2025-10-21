import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Message } from '@messageai/shared';
import { formatMessageTime } from '../../utils/dateFormatter';
import StatusIcon from '../atoms/StatusIcon';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onRetry?: () => void;
}

export default function MessageBubble({ message, isOwnMessage, onRetry }: MessageBubbleProps) {

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
          {isOwnMessage && (
            <View style={styles.statusIcon}>
              <StatusIcon status={message.status} />
            </View>
          )}
        </View>
        
        {/* Retry button for failed messages */}
        {message.status === 'failed' && isOwnMessage && onRetry && (
          <View style={styles.retryContainer}>
            <Button
              mode="text"
              onPress={onRetry}
              compact
              textColor="#f44336"
              style={styles.retryButton}
            >
              Retry
            </Button>
          </View>
        )}
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
  retryContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  retryButton: {
    marginTop: -4,
  },
});

