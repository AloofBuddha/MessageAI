import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';
import { initializeDatabase } from '../src/services/sqlite/database';
import { initializeNetworkMonitor } from '../src/services/network/networkMonitor';
import { syncManager } from '../src/services/sync/syncManager';

export default function RootLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const { isAuthenticated, isLoading, initializeAuthListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    async function initialize() {
      try {
        console.log('🚀 Starting app initialization...');
        
        // Initialize SQLite database and run migrations
        await initializeDatabase();
        setIsDbInitialized(true);
        console.log('✅ Database initialized');
        
        // Initialize network monitoring
        initializeNetworkMonitor();
        console.log('✅ Network monitor initialized');
        
        // Initialize sync manager (for pending messages)
        await syncManager.initialize();
        console.log('✅ All services initialized');
        
        setIsMounted(true);
        
        // Give Zustand persist time to hydrate
        setTimeout(() => {
          setIsHydrated(true);
          console.log('✅ App ready');
        }, 100);
        
        // Initialize Firebase Auth listener
        initializeAuthListener();
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        // Still set states to allow UI to render (may show errors)
        setIsDbInitialized(true);
        setIsMounted(true);
        setIsHydrated(true);
      }
    }
    
    initialize();
  }, []);
  
  useEffect(() => {
    if (!isMounted || !isHydrated || !isDbInitialized || isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    // Redirect to login if not authenticated and not already in auth group
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } 
    // Redirect to main app if authenticated and in auth group
    else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isMounted, isHydrated, isDbInitialized, isAuthenticated, isLoading, segments]);
  
  // Show loading screen while initializing
  if (!isMounted || !isHydrated || !isDbInitialized) {
    return (
      <PaperProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Initializing...
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

