import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';

export default function RootLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAuthenticated, isLoading, initializeAuthListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    setIsMounted(true);
    // Give Zustand persist time to hydrate
    setTimeout(() => setIsHydrated(true), 100);
    
    // Initialize Firebase Auth listener
    initializeAuthListener();
  }, []);
  
  useEffect(() => {
    if (!isMounted || !isHydrated || isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    // Redirect to login if not authenticated and not already in auth group
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } 
    // Redirect to main app if authenticated and in auth group
    else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isMounted, isHydrated, isAuthenticated, isLoading, segments]);
  
  // Show loading screen while initializing
  if (!isMounted || !isHydrated) {
    return (
      <PaperProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading...
          </Text>
        </View>
      </PaperProvider>
    );
  }
  
  return (
    <PaperProvider>
      <Slot />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
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
});

