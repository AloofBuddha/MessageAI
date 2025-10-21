// Mock for expo-sqlite

const mockDatabase = {
  execSync: jest.fn(),
  runSync: jest.fn(),
  getFirstSync: jest.fn(),
  getAllSync: jest.fn(),
  withTransactionSync: jest.fn((callback: () => void) => {
    callback();
  }),
};

export const openDatabaseSync = jest.fn(() => mockDatabase);

// Helper to reset mocks between tests
export const resetDatabaseMock = () => {
  mockDatabase.execSync.mockClear();
  mockDatabase.runSync.mockClear();
  mockDatabase.getFirstSync.mockClear();
  mockDatabase.getAllSync.mockClear();
  mockDatabase.withTransactionSync.mockClear();
};

// Helper to access the mock database for test assertions
export const getMockDatabase = () => mockDatabase;

