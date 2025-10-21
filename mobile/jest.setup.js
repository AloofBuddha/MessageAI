// Setup React Native mocks
global.window = global.window || {};
global.window.navigator = global.window.navigator || {};

// Mock react-native
jest.mock('react-native', () => ({
  LogBox: {
    ignoreLogs: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Suppress console output during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

