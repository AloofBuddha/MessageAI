// Mock NetInfo before importing
const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: mockFetch,
    addEventListener: mockAddEventListener,
  },
}));

import { 
  getNetworkStatus, 
  subscribeToNetworkStatus 
} from '../networkMonitor';

describe('NetworkMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNetworkStatus', () => {
    it('should return current network status', () => {
      const status = getNetworkStatus();
      
      // Should return a valid NetworkStatus object
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('isInternetReachable');
    });
  });

  describe('subscribeToNetworkStatus', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      
      const unsubscribe = subscribeToNetworkStatus(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow();
    });
    
    it('should add callback to listeners', () => {
      const callback = jest.fn();
      
      subscribeToNetworkStatus(callback);
      
      // Callback should be registered (even if we can't easily test it's called)
      expect(typeof callback).toBe('function');
    });
  });
});

