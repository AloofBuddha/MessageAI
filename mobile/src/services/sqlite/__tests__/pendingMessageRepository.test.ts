// Mock the database module before importing repository
jest.mock('../database', () => ({
  db: {
    runSync: jest.fn(),
    getAllSync: jest.fn(),
    getFirstSync: jest.fn(),
  },
}));

import { PendingMessageRepository } from '../pendingMessageRepository';
import { db as mockDb } from '../database';

describe('PendingMessageRepository', () => {
  let repository: PendingMessageRepository;

  beforeEach(() => {
    repository = new PendingMessageRepository();
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('should add a message to pending queue', async () => {
      const pendingMessage = {
        localId: 'local-1',
        conversationId: 'conv-1',
        type: 'text' as const,
        content: 'Hello',
        imageLocalUri: null,
        createdAt: Date.now(),
      };

      await repository.add(pendingMessage);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO pending_messages'),
        [
          'local-1',
          'conv-1',
          'text',
          'Hello',
          null,
          pendingMessage.createdAt,
        ]
      );
    });
  });

  describe('getAll', () => {
    it('should return all pending messages', async () => {
      const mockRows = [
        {
          local_id: 'local-1',
          conversation_id: 'conv-1',
          type: 'text' as const,
          content: 'Hello',
          image_local_uri: null,
          created_at: Date.now(),
          retry_count: 0,
          last_attempt_at: null,
        },
      ];

      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await repository.getAll();

      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        'SELECT * FROM pending_messages ORDER BY created_at ASC'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        localId: 'local-1',
        conversationId: 'conv-1',
        content: 'Hello',
        retryCount: 0,
      });
    });
  });

  describe('getByConversation', () => {
    it('should return pending messages for a conversation', async () => {
      const mockRows = [
        {
          local_id: 'local-1',
          conversation_id: 'conv-1',
          type: 'text' as const,
          content: 'Hello',
          image_local_uri: null,
          created_at: Date.now(),
          retry_count: 0,
          last_attempt_at: null,
        },
      ];

      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await repository.getByConversation('conv-1');

      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM pending_messages WHERE conversation_id = ?'),
        ['conv-1']
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('should delete a pending message', async () => {
      await repository.delete('local-1');

      expect(mockDb.runSync).toHaveBeenCalledWith(
        'DELETE FROM pending_messages WHERE local_id = ?',
        ['local-1']
      );
    });
  });

  describe('count', () => {
    it('should return count of pending messages', async () => {
      mockDb.getFirstSync.mockReturnValue({ count: 5 });

      const result = await repository.count();

      expect(mockDb.getFirstSync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM pending_messages'
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no pending messages', async () => {
      mockDb.getFirstSync.mockReturnValue(null);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});

