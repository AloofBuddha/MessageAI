import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
        mode="outlined"
        multiline
        maxLength={1000}
        disabled={disabled}
        dense
        style={styles.input}
        outlineStyle={styles.outline}
        contentStyle={styles.inputContent}
      />
      <IconButton
        icon="send"
        size={24}
        iconColor={message.trim() && !disabled ? '#6200ee' : '#ccc'}
        disabled={!message.trim() || disabled}
        onPress={handleSend}
        style={styles.sendButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  inputContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  outline: {
    borderRadius: 24,
  },
  sendButton: {
    margin: 0,
  },
});

