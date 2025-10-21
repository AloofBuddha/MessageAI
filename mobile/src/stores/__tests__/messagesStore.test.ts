// Mock Firebase before any imports
jest.mock('../../services/firebase/config', () => ({
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

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { Message } from '@messageai/shared';
import { useMessagesStore } from '../messagesStore';
import { messageRepository } from '../../services/sqlite/messageRepository';
import { listenToMessages, sendMessage as sendMessageToFirestore } from '../../services/firestore/messagesService';
import { getNetworkStatus } from '../../services/network/networkMonitor';
import { syncManager } from '../../services/sync/syncManager';

// Mock dependencies
jest.mock('../../services/sqlite/messageRepository');
jest.mock('../../services/firestore/messagesService');
jest.mock('../../services/network/networkMonitor');
jest.mock('../../services/sync/syncManager');

const mockMessageRepo = messageRepository as jest.Mocked<typeof messageRepository>;
const mockListenToMessages = listenToMessages as jest.MockedFunction<typeof listenToMessages>;
const mockSendMessageToFirestore = sendMessageToFirestore as jest.MockedFunction<typeof sendMessageToFirestore>;
const mockGetNetworkStatus = getNetworkStatus as jest.MockedFunction<typeof getNetworkStatus>;
const mockSyncManager = syncManager as jest.Mocked<typeof syncManager>;

describe('MessagesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state
    useMessagesStore.setState({
      messagesByConversation: {},
      isLoading: {},
      error: {},
      unsubscribers: {},
    });
    
    // Default: online status
    mockGetNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  describe('loadMessages', () => {
    it('should load messages from cache first', async () => {
      const cachedMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: 'text',
          content: 'Cached message',
          imageURL: null,
          timestamp: new Date(),
          status: 'sent',
          deliveredTo: [],
          readBy: [],
          localId: null,
        },
      ];

      mockMessageRepo.getByConversation.mockResolvedValue(cachedMessages);
      mockListenToMessages.mockReturnValue(() => {}); // Mock unsubscribe

      await useMessagesStore.getState().loadMessages('conv-1');

      // Verify cache was called first
      expect(mockMessageRepo.getByConversation).toHaveBeenCalledWith('conv-1');
      
      // Verify messages are in state
      const state = useMessagesStore.getState();
      expect(state.messagesByConversation['conv-1']).toEqual(cachedMessages);
      expect(state.isLoading['conv-1']).toBe(false);
    });

    it('should set up Firestore listener after loading cache', async () => {
      mockMessageRepo.getByConversation.mockResolvedValue([]);
      mockListenToMessages.mockReturnValue(() => {}); // Mock unsubscribe

      await useMessagesStore.getState().loadMessages('conv-1');

      // Verify Firestore listener was set up
      expect(mockListenToMessages).toHaveBeenCalledWith(
        'conv-1',
        expect.any(Function), // onSuccess callback
        expect.any(Function)  // onError callback
      );
    });

    it('should replace cache when Firestore data arrives', async () => {
      const cachedMessages: Message[] = [];
      const firestoreMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: 'text',
          content: 'Firestore message',
          imageURL: null,
          timestamp: new Date(),
          status: 'sent',
          deliveredTo: [],
          readBy: [],
          localId: null,
        },
      ];

      mockMessageRepo.getByConversation.mockResolvedValue(cachedMessages);
      mockMessageRepo.replaceForConversation.mockResolvedValue(undefined);

      let firestoreCallback: (messages: Message[]) => void = () => {};
      
      mockListenToMessages.mockImplementation((conversationId, onSuccess) => {
        firestoreCallback = onSuccess;
        return () => {};
      });

      await useMessagesStore.getState().loadMessages('conv-1');

      // Simulate Firestore data arriving
      await firestoreCallback(firestoreMessages);

      // Verify cache was replaced
      expect(mockMessageRepo.replaceForConversation).toHaveBeenCalledWith('conv-1', firestoreMessages);
      
      // Verify state was updated
      const state = useMessagesStore.getState();
      expect(state.messagesByConversation['conv-1']).toEqual(firestoreMessages);
    });
  });

  describe('sendMessage', () => {
    it('should add message to pending queue when offline', async () => {
      mockGetNetworkStatus.mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });

      mockMessageRepo.upsert.mockResolvedValue(undefined);
      mockSyncManager.addToPendingQueue.mockResolvedValue(undefined);

      await useMessagesStore.getState().sendMessage('conv-1', 'user-1', 'Hello offline');

      // Verify message was added to pending queue
      expect(mockSyncManager.addToPendingQueue).toHaveBeenCalledWith(
        expect.any(String), // localId
        'conv-1',
        'text',
        'Hello offline'
      );

      // Verify message was NOT sent to Firestore
      expect(mockSendMessageToFirestore).not.toHaveBeenCalled();
    });

    it('should send message to Firestore when online', async () => {
      mockGetNetworkStatus.mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
      });

      mockMessageRepo.upsert.mockResolvedValue(undefined);
      mockSendMessageToFirestore.mockResolvedValue(undefined);

      await useMessagesStore.getState().sendMessage('conv-1', 'user-1', 'Hello online');

      // Verify message was sent to Firestore
      expect(mockSendMessageToFirestore).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
        'Hello online',
        'text',
        null,
        expect.any(String) // localId
      );

      // Verify message was NOT added to pending queue
      expect(mockSyncManager.addToPendingQueue).not.toHaveBeenCalled();
    });

    it('should create optimistic message immediately', async () => {
      mockGetNetworkStatus.mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
      });

      mockMessageRepo.upsert.mockResolvedValue(undefined);
      mockSendMessageToFirestore.mockResolvedValue(undefined);

      await useMessagesStore.getState().sendMessage('conv-1', 'user-1', 'Test message');

      // Verify optimistic message is in state
      const state = useMessagesStore.getState();
      const messages = state.messagesByConversation['conv-1'];
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        content: 'Test message',
        status: 'sending',
        senderId: 'user-1',
      });
    });

    it('should update status to failed when send fails', async () => {
      mockGetNetworkStatus.mockReturnValue({
        isConnected: true,
        isInternetReachable: true,
      });

      mockMessageRepo.upsert.mockResolvedValue(undefined);
      mockMessageRepo.updateStatus.mockResolvedValue(undefined);
      mockSendMessageToFirestore.mockRejectedValue(new Error('Network error'));

      await expect(
        useMessagesStore.getState().sendMessage('conv-1', 'user-1', 'Failed message')
      ).rejects.toThrow('Network error');

      // Verify status was updated to failed
      const state = useMessagesStore.getState();
      const messages = state.messagesByConversation['conv-1'];
      
      expect(messages[0].status).toBe('failed');
      expect(mockMessageRepo.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        'failed'
      );
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status in state and cache', () => {
      // Set up initial state with a message
      useMessagesStore.setState({
        messagesByConversation: {
          'conv-1': [
            {
              id: 'msg-1',
              conversationId: 'conv-1',
              senderId: 'user-1',
              type: 'text',
              content: 'Test',
              imageURL: null,
              timestamp: new Date(),
              status: 'sending',
              deliveredTo: [],
              readBy: [],
              localId: 'local-1',
            },
          ],
        },
      });

      mockMessageRepo.updateStatus.mockResolvedValue(undefined);

      useMessagesStore.getState().updateMessageStatus('local-1', 'sent');

      // Verify state was updated
      const state = useMessagesStore.getState();
      expect(state.messagesByConversation['conv-1'][0].status).toBe('sent');
      
      // Verify cache was updated
      expect(mockMessageRepo.updateStatus).toHaveBeenCalledWith('local-1', 'sent');
    });
  });
});

