import { Message } from '@messageai/shared';

// Mock the database module before importing repository
jest.mock('../database', () => ({
  db: {
    runSync: jest.fn(),
    getAllSync: jest.fn(),
    withTransactionSync: jest.fn((callback: () => void) => callback()),
  },
}));

import { MessageRepository } from '../messageRepository';
import { db as mockDb } from '../database';

describe('MessageRepository', () => {
  let repository: MessageRepository;

  beforeEach(() => {
    repository = new MessageRepository();
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('should insert or replace a message', async () => {
      const message: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Hello',
        imageURL: null,
        timestamp: new Date('2025-01-01'),
        status: 'sent',
        deliveredTo: ['user-2'],
        readBy: [],
        localId: 'local-1',
      };

      await repository.upsert(message);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO messages'),
        expect.arrayContaining([
          'msg-1',
          'conv-1',
          'user-1',
          'text',
          'Hello',
          null,
          new Date('2025-01-01').getTime(),
          'sent',
          JSON.stringify(['user-2']),
          JSON.stringify([]),
          'local-1',
          expect.any(Number), // synced_at
        ])
      );
    });
  });

  describe('getByConversation', () => {
    it('should return messages for a conversation', async () => {
      const mockRows = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'user-1',
          type: 'text' as const,
          content: 'Hello',
          image_url: null,
          timestamp: new Date('2025-01-01').getTime(),
          status: 'sent' as const,
          delivered_to: JSON.stringify(['user-2']),
          read_by: JSON.stringify([]),
          local_id: 'local-1',
        },
      ];

      mockDb.getAllSync.mockReturnValue(mockRows);

      const result = await repository.getByConversation('conv-1');

      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM messages'),
        ['conv-1']
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello',
        status: 'sent',
      });
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });

    it('should return empty array when no messages found', async () => {
      mockDb.getAllSync.mockReturnValue([]);

      const result = await repository.getByConversation('conv-1');

      expect(result).toEqual([]);
    });
  });

  describe('replaceForConversation', () => {
    it('should delete old messages and insert new ones in a transaction', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: 'text',
          content: 'Hello',
          imageURL: null,
          timestamp: new Date('2025-01-01'),
          status: 'sent',
          deliveredTo: [],
          readBy: [],
          localId: null,
        },
      ];

      await repository.replaceForConversation('conv-1', messages);

      expect(mockDb.withTransactionSync).toHaveBeenCalled();
      expect(mockDb.runSync).toHaveBeenCalledWith(
        'DELETE FROM messages WHERE conversation_id = ?',
        ['conv-1']
      );
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.any(Array)
      );
    });
  });

  describe('updateStatus', () => {
    it('should update message status', async () => {
      await repository.updateStatus('msg-1', 'delivered');

      expect(mockDb.runSync).toHaveBeenCalledWith(
        'UPDATE messages SET status = ?, synced_at = ? WHERE id = ?',
        ['delivered', expect.any(Number), 'msg-1']
      );
    });
  });

  describe('deleteByConversation', () => {
    it('should delete all messages for a conversation', async () => {
      await repository.deleteByConversation('conv-1');

      expect(mockDb.runSync).toHaveBeenCalledWith(
        'DELETE FROM messages WHERE conversation_id = ?',
        ['conv-1']
      );
    });
  });
});

