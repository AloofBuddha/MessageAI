import { Conversation } from '@messageai/shared';

// Mock the database module before importing repository
jest.mock('../database', () => ({
  db: {
    runSync: jest.fn(),
    getAllSync: jest.fn(),
    getFirstSync: jest.fn(),
    withTransactionSync: jest.fn((callback: () => void) => callback()),
  },
}));

import { ConversationRepository } from '../conversationRepository';
import { db as mockDb } from '../database';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;

  beforeEach(() => {
    repository = new ConversationRepository();
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('should insert or replace a conversation', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        type: 'direct',
        name: null,
        participants: ['user-1', 'user-2'],
        lastMessage: 'Hello',
        lastMessageTimestamp: new Date('2025-01-01'),
        groupPictureURL: null,
        createdAt: new Date('2025-01-01'),
        createdBy: 'user-1',
      };

      await repository.upsert(conversation);

      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO conversations'),
        expect.arrayContaining([
          'conv-1',
          'direct',
          null,
          JSON.stringify(['user-1', 'user-2']),
          'Hello',
          new Date('2025-01-01').getTime(),
          null,
          new Date('2025-01-01').getTime(),
          'user-1',
          expect.any(Number), // synced_at
        ])
      );
    });
  });

  describe('getForUser', () => {
    it('should return conversations for a user', async () => {
      const mockRows = [
        {
          id: 'conv-1',
          type: 'direct' as const,
          name: null,
          participants: JSON.stringify(['user-1', 'user-2']),
          last_message: 'Hello',
          last_message_timestamp: new Date('2025-01-01').getTime(),
          group_picture_url: null,
          created_at: new Date('2025-01-01').getTime(),
          created_by: 'user-1',
        },
      ];

      (mockDb.getAllSync as jest.Mock).mockReturnValue(mockRows);

      const result = await repository.getForUser('user-1');

      expect(mockDb.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conversations'),
        ['%"user-1"%']
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'conv-1',
        type: 'direct',
        lastMessage: 'Hello',
      });
      expect(result[0].participants).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array when no conversations found', async () => {
      (mockDb.getAllSync as jest.Mock).mockReturnValue([]);

      const result = await repository.getForUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a conversation by ID', async () => {
      const mockRow = {
        id: 'conv-1',
        type: 'direct' as const,
        name: null,
        participants: JSON.stringify(['user-1', 'user-2']),
        last_message: 'Hello',
        last_message_timestamp: new Date('2025-01-01').getTime(),
        group_picture_url: null,
        created_at: new Date('2025-01-01').getTime(),
        created_by: 'user-1',
      };

      (mockDb.getFirstSync as jest.Mock).mockReturnValue(mockRow);

      const result = await repository.getById('conv-1');

      expect(mockDb.getFirstSync).toHaveBeenCalledWith(
        'SELECT * FROM conversations WHERE id = ?',
        ['conv-1']
      );

      expect(result).toMatchObject({
        id: 'conv-1',
        type: 'direct',
      });
    });

    it('should return null when conversation not found', async () => {
      (mockDb.getFirstSync as jest.Mock).mockReturnValue(null);

      const result = await repository.getById('conv-1');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a conversation', async () => {
      await repository.delete('conv-1');

      expect(mockDb.runSync).toHaveBeenCalledWith(
        'DELETE FROM conversations WHERE id = ?',
        ['conv-1']
      );
    });
  });
});

