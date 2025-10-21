import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';

export default function RootLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (!isMounted || isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    // Redirect to login if not authenticated and not already in auth group
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } 
    // Redirect to main app if authenticated and in auth group
    else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isMounted, isAuthenticated, isLoading, segments]);
  
  return (
    <PaperProvider>
      <Slot />
    </PaperProvider>
  );
}

