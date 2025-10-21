import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="chat-outline" size={80} color="#6200ee" />
        
        <Text variant="headlineMedium" style={styles.title}>
          Chat Screen
        </Text>
        
        <Text variant="bodyLarge" style={styles.subtitle}>
          Conversation ID: {id}
        </Text>
        
        <Text variant="bodyMedium" style={styles.placeholder}>
          Real-time messaging will be implemented in Story 1.4
        </Text>
        
        <Button
          mode="contained"
          onPress={() => router.back()}
          style={styles.backButton}
          icon="arrow-left"
        >
          Back to Conversations
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 16,
    color: '#666',
  },
  placeholder: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
    marginBottom: 32,
  },
  backButton: {
    marginTop: 16,
    minWidth: 200,
  },
});

