// Mock Firebase before any imports
jest.mock('../../firebase/config', () => ({
  app: {},
  auth: {},
  firestore: {},
  storage: {},
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

import { syncManager } from '../syncManager';
import { pendingMessageRepository } from '../../sqlite/pendingMessageRepository';
import { sendMessage } from '../../firestore/messagesService';
import { getNetworkStatus } from '../../network/networkMonitor';

// Mock dependencies
jest.mock('../../sqlite/pendingMessageRepository');
jest.mock('../../firestore/messagesService');
jest.mock('../../network/networkMonitor');
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    })),
  },
}));

const mockPendingRepo = pendingMessageRepository as jest.Mocked<typeof pendingMessageRepository>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;
const mockGetNetworkStatus = getNetworkStatus as jest.MockedFunction<typeof getNetworkStatus>;

describe('SyncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: online status
    mockGetNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  describe('addToPendingQueue', () => {
    it('should add message to pending queue', async () => {
      await syncManager.addToPendingQueue(
        'local-1',
        'conv-1',
        'text',
        'Hello'
      );

      expect(mockPendingRepo.add).toHaveBeenCalledWith({
        localId: 'local-1',
        conversationId: 'conv-1',
        type: 'text',
        content: 'Hello',
        imageLocalUri: null,
        createdAt: expect.any(Number),
      });
    });

    it('should handle image messages', async () => {
      await syncManager.addToPendingQueue(
        'local-1',
        'conv-1',
        'image',
        'image-caption',
        'file://local/image.jpg'
      );

      expect(mockPendingRepo.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          imageLocalUri: 'file://local/image.jpg',
        })
      );
    });
  });

  describe('processPendingQueue', () => {
    it('should skip processing when offline', async () => {
      mockGetNetworkStatus.mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });

      await syncManager.processPendingQueue();

      expect(mockPendingRepo.getAll).not.toHaveBeenCalled();
    });

    it('should process pending messages when online', async () => {
      const pendingMessages = [
        {
          localId: 'local-1',
          conversationId: 'conv-1',
          type: 'text' as const,
          content: 'Hello',
          imageLocalUri: null,
          createdAt: Date.now(),
          retryCount: 0,
          lastAttemptAt: null,
        },
      ];

      mockPendingRepo.getAll.mockResolvedValue(pendingMessages);
      mockSendMessage.mockResolvedValue(undefined);

      await syncManager.processPendingQueue();

      expect(mockPendingRepo.getAll).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        'Hello',
        'text',
        null,
        'local-1'
      );
      expect(mockPendingRepo.delete).toHaveBeenCalledWith('local-1');
    });

    it('should do nothing when queue is empty', async () => {
      mockPendingRepo.getAll.mockResolvedValue([]);

      await syncManager.processPendingQueue();

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(mockPendingRepo.delete).not.toHaveBeenCalled();
    });

    it('should increment retry count on failure', async () => {
      const pendingMessages = [
        {
          localId: 'local-1',
          conversationId: 'conv-1',
          type: 'text' as const,
          content: 'Hello',
          imageLocalUri: null,
          createdAt: Date.now(),
          retryCount: 0,
          lastAttemptAt: null,
        },
      ];

      mockPendingRepo.getAll.mockResolvedValue(pendingMessages);
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      await syncManager.processPendingQueue();

      expect(mockPendingRepo.incrementRetry).toHaveBeenCalledWith('local-1');
      expect(mockPendingRepo.delete).not.toHaveBeenCalled();
    });

    it('should not process concurrently', async () => {
      mockPendingRepo.getAll.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      // Start two processes concurrently
      const promise1 = syncManager.processPendingQueue();
      const promise2 = syncManager.processPendingQueue();

      await Promise.all([promise1, promise2]);

      // Should only fetch once (second call skipped)
      expect(mockPendingRepo.getAll).toHaveBeenCalledTimes(1);
    });
  });
});

