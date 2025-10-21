// Mock for @react-native-community/netinfo

export interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
}

let mockNetworkState: NetInfoState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
};

const listeners: Array<(state: NetInfoState) => void> = [];

export default {
  fetch: jest.fn(() => Promise.resolve(mockNetworkState)),
  addEventListener: jest.fn((listener: (state: NetInfoState) => void) => {
    listeners.push(listener);
    return jest.fn(() => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    });
  }),
};

// Test helpers
export const setMockNetworkState = (state: Partial<NetInfoState>) => {
  mockNetworkState = { ...mockNetworkState, ...state };
  listeners.forEach((listener) => listener(mockNetworkState));
};

export const getMockNetworkState = () => mockNetworkState;

export const resetNetworkMock = () => {
  mockNetworkState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };
  listeners.length = 0;
};

