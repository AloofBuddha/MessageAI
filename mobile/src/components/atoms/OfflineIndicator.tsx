import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetworkStatus } from '../../services/network/networkMonitor';

export default function OfflineIndicator() {
  const networkStatus = useNetworkStatus();
  
  // Show if not connected OR no internet reachable
  const isOffline = !networkStatus.isConnected || networkStatus.isInternetReachable === false;
  
  if (!isOffline) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="wifi-off" size={16} color="#000" />
      <Text style={styles.text}>
        No connection. Messages will send when online.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
});

