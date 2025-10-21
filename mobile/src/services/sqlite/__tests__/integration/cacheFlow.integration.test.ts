import { Message, Conversation } from '@messageai/shared';
import { createTestDatabase, initializeTestSchema, TestDatabase } from './testDatabase';

/**
 * Integration tests for cache-first data flow patterns
 * Tests the complete flow from cache → Firestore sync → cache update
 */

class CacheFirstService {
  constructor(
    private db: TestDatabase,
    private simulateFirestore: (conversationId: string) => Promise<Message[]>
  ) {}

  /**
   * Simulates the loadMessages pattern:
   * 1. Load from cache immediately
   * 2. Subscribe to Firestore
   * 3. Replace cache with Firestore data
   */
  async loadMessagesWithCacheFirst(conversationId: string): Promise<{
    cachedMessages: Message[];
    firestoreMessages: Message[];
  }> {
    // Step 1: Load from cache (instant)
    const cachedMessages = await this.getFromCache(conversationId);

    // Step 2: Simulate Firestore listener firing (async)
    const firestoreMessages = await this.simulateFirestore(conversationId);

    // Step 3: Replace cache with Firestore data
    await this.replaceCache(conversationId, firestoreMessages);

    return {
      cachedMessages,
      firestoreMessages,
    };
  }

  private async getFromCache(conversationId: string): Promise<Message[]> {
    const rows = this.db.getAllSync<{
      id: string;
      conversation_id: string;
      sender_id: string;
      type: 'text' | 'image';
      content: string;
      image_url: string | null;
      timestamp: number;
      status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
      delivered_to: string;
      read_by: string;
      local_id: string | null;
    }>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
      [conversationId]
    );

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      type: row.type,
      content: row.content,
      imageURL: row.image_url,
      timestamp: new Date(row.timestamp),
      status: row.status,
      deliveredTo: JSON.parse(row.delivered_to),
      readBy: JSON.parse(row.read_by),
      localId: row.local_id,
    }));
  }

  private async replaceCache(conversationId: string, messages: Message[]): Promise<void> {
    this.db.withTransactionSync(() => {
      // Delete old cache
      this.db.runSync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);

      // Insert new data
      for (const message of messages) {
        this.db.runSync(
          `INSERT INTO messages 
          (id, conversation_id, sender_id, type, content, image_url, timestamp, status, delivered_to, read_by, local_id, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            message.id,
            message.conversationId,
            message.senderId,
            message.type,
            message.content,
            message.imageURL || null,
            message.timestamp.getTime(),
            message.status,
            JSON.stringify(message.deliveredTo),
            JSON.stringify(message.readBy),
            message.localId || null,
            Date.now(),
          ]
        );
      }
    });
  }
}

class OfflineQueueService {
  constructor(private db: TestDatabase) {}

  /**
   * Simulates offline message sending:
   * 1. Add optimistic message to cache
   * 2. Add to pending queue
   * 3. Process queue when online
   * 4. Update cache with confirmed message
   */
  async sendMessageOffline(message: Message): Promise<void> {
    // Step 1: Optimistic update to cache
    this.db.runSync(
      `INSERT INTO messages 
      (id, conversation_id, sender_id, type, content, image_url, timestamp, status, delivered_to, read_by, local_id, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.type,
        message.content,
        message.imageURL || null,
        message.timestamp.getTime(),
        'sending',
        JSON.stringify([]),
        JSON.stringify([]),
        message.localId || null,
        Date.now(),
      ]
    );

    // Step 2: Add to pending queue
    this.db.runSync(
      `INSERT INTO pending_messages 
      (local_id, conversation_id, type, content, image_local_uri, created_at, retry_count, last_attempt_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
      [message.localId!, message.conversationId, message.type, message.content, null, Date.now()]
    );
  }

  async processPendingQueue(): Promise<number> {
    const pending = this.db.getAllSync<{
      local_id: string;
      conversation_id: string;
    }>('SELECT * FROM pending_messages ORDER BY created_at ASC');

    for (const item of pending) {
      // Simulate sending to Firestore
      // In real app, this would call Firebase

      // Update message status
      this.db.runSync(
        'UPDATE messages SET status = ? WHERE local_id = ?',
        ['sent', item.local_id]
      );

      // Remove from pending queue
      this.db.runSync('DELETE FROM pending_messages WHERE local_id = ?', [item.local_id]);
    }

    return pending.length;
  }

  async getPendingCount(): Promise<number> {
    const result = this.db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_messages'
    );
    return result?.count || 0;
  }
}

describe('Cache-First Flow Integration Tests', () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = createTestDatabase();
    initializeTestSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Cache-First Loading Pattern', () => {
    it('should load stale cache first, then update with fresh data', async () => {
      // Populate cache with old data
      db.runSync(
        `INSERT INTO messages (id, conversation_id, sender_id, type, content, image_url, timestamp, status, delivered_to, read_by, local_id, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['msg-1', 'conv-1', 'user-1', 'text', 'Old cached message', null, Date.now(), 'sent', '[]', '[]', null, Date.now() - 60000]
      );

      // Simulate Firestore returning fresh data
      const mockFirestore = async (conversationId: string): Promise<Message[]> => {
        return [
          {
            id: 'msg-1',
            conversationId,
            senderId: 'user-1',
            type: 'text',
            content: 'Old cached message',
            imageURL: null,
            timestamp: new Date(),
            status: 'read',
            deliveredTo: ['user-2'],
            readBy: ['user-2'],
            localId: null,
          },
          {
            id: 'msg-2',
            conversationId,
            senderId: 'user-2',
            type: 'text',
            content: 'New message from Firestore',
            imageURL: null,
            timestamp: new Date(),
            status: 'sent',
            deliveredTo: [],
            readBy: [],
            localId: null,
          },
        ];
      };

      const service = new CacheFirstService(db, mockFirestore);
      const result = await service.loadMessagesWithCacheFirst('conv-1');

      // Verify cache returned immediately with old data
      expect(result.cachedMessages).toHaveLength(1);
      expect(result.cachedMessages[0].content).toBe('Old cached message');
      expect(result.cachedMessages[0].status).toBe('sent');

      // Verify Firestore data is fresher
      expect(result.firestoreMessages).toHaveLength(2);
      expect(result.firestoreMessages[1].content).toBe('New message from Firestore');

      // Verify cache was updated
      const updatedCache = db.getAllSync<{ id: string; content: string }>(
        'SELECT id, content FROM messages WHERE conversation_id = ?',
        ['conv-1']
      );
      expect(updatedCache).toHaveLength(2);
      expect(updatedCache.find(m => m.id === 'msg-2')).toBeDefined();
    });

    it('should handle empty cache gracefully', async () => {
      const mockFirestore = async (conversationId: string): Promise<Message[]> => {
        return [
          {
            id: 'msg-1',
            conversationId,
            senderId: 'user-1',
            type: 'text',
            content: 'First message',
            imageURL: null,
            timestamp: new Date(),
            status: 'sent',
            deliveredTo: [],
            readBy: [],
            localId: null,
          },
        ];
      };

      const service = new CacheFirstService(db, mockFirestore);
      const result = await service.loadMessagesWithCacheFirst('conv-1');

      expect(result.cachedMessages).toHaveLength(0);
      expect(result.firestoreMessages).toHaveLength(1);
    });
  });

  describe('Offline Queue Pattern', () => {
    it('should queue messages when offline and process when online', async () => {
      const service = new OfflineQueueService(db);

      // Send message while offline
      const message: Message = {
        id: 'temp-id',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Offline message',
        imageURL: null,
        timestamp: new Date(),
        status: 'sending',
        deliveredTo: [],
        readBy: [],
        localId: 'local-1',
      };

      await service.sendMessageOffline(message);

      // Verify message is in cache with "sending" status
      const cachedMessages = db.getAllSync<{ status: string }>(
        'SELECT status FROM messages WHERE local_id = ?',
        ['local-1']
      );
      expect(cachedMessages[0].status).toBe('sending');

      // Verify message is in pending queue
      let pendingCount = await service.getPendingCount();
      expect(pendingCount).toBe(1);

      // Process queue (simulate coming back online)
      const processedCount = await service.processPendingQueue();
      expect(processedCount).toBe(1);

      // Verify message status updated to "sent"
      const updatedMessages = db.getAllSync<{ status: string }>(
        'SELECT status FROM messages WHERE local_id = ?',
        ['local-1']
      );
      expect(updatedMessages[0].status).toBe('sent');

      // Verify pending queue is empty
      pendingCount = await service.getPendingCount();
      expect(pendingCount).toBe(0);
    });

    it('should handle multiple queued messages', async () => {
      const service = new OfflineQueueService(db);

      // Queue 3 messages
      for (let i = 1; i <= 3; i++) {
        await service.sendMessageOffline({
          id: `temp-${i}`,
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: 'text',
          content: `Message ${i}`,
          imageURL: null,
          timestamp: new Date(),
          status: 'sending',
          deliveredTo: [],
          readBy: [],
          localId: `local-${i}`,
        });
      }

      expect(await service.getPendingCount()).toBe(3);

      // Process all
      const processed = await service.processPendingQueue();
      expect(processed).toBe(3);
      expect(await service.getPendingCount()).toBe(0);

      // Verify all messages updated
      const messages = db.getAllSync<{ status: string }>(
        'SELECT status FROM messages WHERE conversation_id = ?',
        ['conv-1']
      );
      expect(messages.every(m => m.status === 'sent')).toBe(true);
    });
  });

  describe('Transaction Integrity', () => {
    it('should rollback cache replace on error', async () => {
      // Insert initial data
      db.runSync(
        `INSERT INTO messages (id, conversation_id, sender_id, type, content, image_url, timestamp, status, delivered_to, read_by, local_id, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['msg-1', 'conv-1', 'user-1', 'text', 'Original', null, Date.now(), 'sent', '[]', '[]', null, Date.now()]
      );

      // Attempt to replace with invalid data (should fail transaction)
      try {
        db.withTransactionSync(() => {
          db.runSync('DELETE FROM messages WHERE conversation_id = ?', ['conv-1']);
          
          // This should fail due to invalid status
          db.runSync(
            `INSERT INTO messages (id, conversation_id, sender_id, type, content, image_url, timestamp, status, delivered_to, read_by, local_id, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['msg-2', 'conv-1', 'user-1', 'text', 'Invalid', null, Date.now(), 'invalid-status', '[]', '[]', null, Date.now()]
          );
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify original data is still intact (transaction rolled back)
      const messages = db.getAllSync<{ content: string }>(
        'SELECT content FROM messages WHERE conversation_id = ?',
        ['conv-1']
      );
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Original');
    });
  });
});

