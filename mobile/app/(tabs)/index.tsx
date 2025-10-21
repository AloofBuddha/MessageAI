import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuthStore } from '../../src/stores/authStore';

export default function ConversationsScreen() {
  const { user, logout } = useAuthStore();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Welcome, {user?.displayName || 'User'}! 👋
        </Text>
        
        <Text variant="bodyLarge" style={styles.subtitle}>
          You're successfully authenticated
        </Text>
        
        <View style={styles.info}>
          <Text variant="bodyMedium" style={styles.infoText}>
            Email: {user?.email}
          </Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            User ID: {user?.id}
          </Text>
        </View>
        
        <Text variant="bodyMedium" style={styles.placeholder}>
          Conversation list will appear here in the next story...
        </Text>
        
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          icon="logout"
        >
          Logout
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
  welcome: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  info: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  infoText: {
    marginBottom: 8,
  },
  placeholder: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
    marginBottom: 32,
  },
  logoutButton: {
    marginTop: 16,
    minWidth: 200,
  },
});

