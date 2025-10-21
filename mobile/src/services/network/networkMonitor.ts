import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

let currentNetworkStatus: NetworkStatus = {
  isConnected: false,
  isInternetReachable: null,
};

const listeners = new Set<(status: NetworkStatus) => void>();

/**
 * Initialize network monitoring
 * Call this once at app startup
 */
export function initializeNetworkMonitor(): void {
  // Fetch initial network state
  NetInfo.fetch().then((state: NetInfoState) => {
    const initialStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
    };
    currentNetworkStatus = initialStatus;
    console.log('📡 Initial network status:', initialStatus);
  });

  // Listen for changes
  NetInfo.addEventListener((state: NetInfoState) => {
    const newStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
    };

    // Only notify if status actually changed
    if (
      newStatus.isConnected !== currentNetworkStatus.isConnected ||
      newStatus.isInternetReachable !== currentNetworkStatus.isInternetReachable
    ) {
      currentNetworkStatus = newStatus;
      console.log('🌐 Network status changed:', newStatus);
      
      // Notify all listeners
      listeners.forEach(listener => listener(newStatus));
    }
  });
}

/**
 * Get current network status
 */
export function getNetworkStatus(): NetworkStatus {
  return currentNetworkStatus;
}

/**
 * Subscribe to network status changes
 */
export function subscribeToNetworkStatus(callback: (status: NetworkStatus) => void): () => void {
  listeners.add(callback);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

/**
 * React hook for network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(currentNetworkStatus);

  useEffect(() => {
    // Get initial status
    NetInfo.fetch().then((state: NetInfoState) => {
      const initialStatus: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
      };
      currentNetworkStatus = initialStatus;
      setStatus(initialStatus);
    });

    // Subscribe to changes
    const unsubscribe = subscribeToNetworkStatus(setStatus);
    
    return unsubscribe;
  }, []);

  return status;
}

