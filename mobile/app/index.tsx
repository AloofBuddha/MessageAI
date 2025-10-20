import { View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.text}>Hello World! 🎉</Text>
      <Text style={styles.subtitle}>MessageAI - MVP Foundation</Text>
      <Text style={styles.debug}>Platform: {Platform.OS}</Text>
      <Text style={styles.debug}>Version: {Platform.Version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  debug: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
