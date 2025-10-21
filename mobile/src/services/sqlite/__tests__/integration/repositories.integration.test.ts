import { Message, Conversation, User } from '@messageai/shared';
import { createTestDatabase, initializeTestSchema, cleanupTestDatabase, TestDatabase } from './testDatabase';

// We'll manually inject the test database into repository classes
// This requires creating repository instances that accept a db parameter

class TestMessageRepository {
  constructor(private db: TestDatabase) {}

  async upsert(message: Message): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO messages 
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

  async getByConversation(conversationId: string): Promise<Message[]> {
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

  async replaceForConversation(conversationId: string, messages: Message[]): Promise<void> {
    this.db.withTransactionSync(() => {
      this.db.runSync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
      
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

  async updateStatus(messageId: string, status: 'sent' | 'delivered' | 'read' | 'failed'): Promise<void> {
    this.db.runSync(
      'UPDATE messages SET status = ?, synced_at = ? WHERE id = ?',
      [status, Date.now(), messageId]
    );
  }
}

class TestConversationRepository {
  constructor(private db: TestDatabase) {}

  async upsert(conversation: Conversation): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO conversations 
      (id, type, name, participants, last_message, last_message_timestamp, group_picture_url, created_at, created_by, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.id,
        conversation.type,
        conversation.name || null,
        JSON.stringify(conversation.participants),
        conversation.lastMessage || null,
        conversation.lastMessageTimestamp?.getTime() || null,
        conversation.groupPictureURL || null,
        conversation.createdAt.getTime(),
        conversation.createdBy,
        Date.now(),
      ]
    );
  }

  async getForUser(userId: string): Promise<Conversation[]> {
    const rows = this.db.getAllSync<{
      id: string;
      type: 'direct' | 'group';
      name: string | null;
      participants: string;
      last_message: string | null;
      last_message_timestamp: number | null;
      group_picture_url: string | null;
      created_at: number;
      created_by: string;
    }>(
      `SELECT * FROM conversations 
       WHERE participants LIKE ? 
       ORDER BY last_message_timestamp DESC`,
      [`%"${userId}"%`]
    );

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      participants: JSON.parse(row.participants),
      lastMessage: row.last_message,
      lastMessageTimestamp: row.last_message_timestamp ? new Date(row.last_message_timestamp) : null,
      groupPictureURL: row.group_picture_url,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
    }));
  }
}

class TestPendingMessageRepository {
  constructor(private db: TestDatabase) {}

  async add(pendingMessage: {
    localId: string;
    conversationId: string;
    type: 'text' | 'image';
    content: string;
    imageLocalUri: string | null;
    createdAt: number;
  }): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO pending_messages 
      (local_id, conversation_id, type, content, image_local_uri, created_at, retry_count, last_attempt_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
      [
        pendingMessage.localId,
        pendingMessage.conversationId,
        pendingMessage.type,
        pendingMessage.content,
        pendingMessage.imageLocalUri || null,
        pendingMessage.createdAt,
      ]
    );
  }

  async getAll(): Promise<any[]> {
    return this.db.getAllSync(
      'SELECT * FROM pending_messages ORDER BY created_at ASC'
    );
  }

  async delete(localId: string): Promise<void> {
    this.db.runSync('DELETE FROM pending_messages WHERE local_id = ?', [localId]);
  }

  async count(): Promise<number> {
    const result = this.db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_messages'
    );
    return result?.count || 0;
  }
}

describe('Repository Integration Tests', () => {
  let db: TestDatabase;
  let messageRepo: TestMessageRepository;
  let conversationRepo: TestConversationRepository;
  let pendingRepo: TestPendingMessageRepository;

  beforeEach(() => {
    db = createTestDatabase();
    initializeTestSchema(db);
    messageRepo = new TestMessageRepository(db);
    conversationRepo = new TestConversationRepository(db);
    pendingRepo = new TestPendingMessageRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('MessageRepository', () => {
    it('should insert and retrieve messages', async () => {
      const message: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Hello, World!',
        imageURL: null,
        timestamp: new Date(),
        status: 'sent',
        deliveredTo: ['user-2'],
        readBy: [],
        localId: null,
      };

      await messageRepo.upsert(message);
      const messages = await messageRepo.getByConversation('conv-1');

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello, World!');
      expect(messages[0].deliveredTo).toEqual(['user-2']);
    });

    it('should update existing messages on upsert', async () => {
      const message: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Original',
        imageURL: null,
        timestamp: new Date(),
        status: 'sending',
        deliveredTo: [],
        readBy: [],
        localId: 'local-1',
      };

      await messageRepo.upsert(message);
      
      // Update the message
      message.content = 'Updated';
      message.status = 'sent';
      await messageRepo.upsert(message);

      const messages = await messageRepo.getByConversation('conv-1');
      
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Updated');
      expect(messages[0].status).toBe('sent');
    });

    it('should replace all messages for a conversation', async () => {
      // Insert initial messages
      await messageRepo.upsert({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Message 1',
        imageURL: null,
        timestamp: new Date(),
        status: 'sent',
        deliveredTo: [],
        readBy: [],
        localId: null,
      });

      await messageRepo.upsert({
        id: 'msg-2',
        conversationId: 'conv-1',
        senderId: 'user-2',
        type: 'text',
        content: 'Message 2',
        imageURL: null,
        timestamp: new Date(),
        status: 'sent',
        deliveredTo: [],
        readBy: [],
        localId: null,
      });

      // Replace with new messages
      const newMessages: Message[] = [
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: 'text',
          content: 'Replaced Message',
          imageURL: null,
          timestamp: new Date(),
          status: 'sent',
          deliveredTo: [],
          readBy: [],
          localId: null,
        },
      ];

      await messageRepo.replaceForConversation('conv-1', newMessages);

      const messages = await messageRepo.getByConversation('conv-1');
      
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-3');
      expect(messages[0].content).toBe('Replaced Message');
    });

    it('should update message status', async () => {
      await messageRepo.upsert({
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
        localId: null,
      });

      await messageRepo.updateStatus('msg-1', 'delivered');

      const messages = await messageRepo.getByConversation('conv-1');
      expect(messages[0].status).toBe('delivered');
    });
  });

  describe('ConversationRepository', () => {
    it('should insert and retrieve conversations', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        type: 'direct',
        name: null,
        participants: ['user-1', 'user-2'],
        lastMessage: 'Hello',
        lastMessageTimestamp: new Date(),
        groupPictureURL: null,
        createdAt: new Date(),
        createdBy: 'user-1',
      };

      await conversationRepo.upsert(conversation);
      const conversations = await conversationRepo.getForUser('user-1');

      expect(conversations).toHaveLength(1);
      expect(conversations[0].participants).toEqual(['user-1', 'user-2']);
    });

    it('should filter conversations by user', async () => {
      await conversationRepo.upsert({
        id: 'conv-1',
        type: 'direct',
        name: null,
        participants: ['user-1', 'user-2'],
        lastMessage: null,
        lastMessageTimestamp: null,
        groupPictureURL: null,
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      await conversationRepo.upsert({
        id: 'conv-2',
        type: 'direct',
        name: null,
        participants: ['user-2', 'user-3'],
        lastMessage: null,
        lastMessageTimestamp: null,
        groupPictureURL: null,
        createdAt: new Date(),
        createdBy: 'user-2',
      });

      const user1Conversations = await conversationRepo.getForUser('user-1');
      const user2Conversations = await conversationRepo.getForUser('user-2');
      const user3Conversations = await conversationRepo.getForUser('user-3');

      expect(user1Conversations).toHaveLength(1);
      expect(user2Conversations).toHaveLength(2);
      expect(user3Conversations).toHaveLength(1);
    });
  });

  describe('PendingMessageRepository', () => {
    it('should add and retrieve pending messages', async () => {
      await pendingRepo.add({
        localId: 'local-1',
        conversationId: 'conv-1',
        type: 'text',
        content: 'Pending message',
        imageLocalUri: null,
        createdAt: Date.now(),
      });

      const pending = await pendingRepo.getAll();
      expect(pending).toHaveLength(1);
      expect(pending[0].content).toBe('Pending message');
    });

    it('should delete pending messages', async () => {
      await pendingRepo.add({
        localId: 'local-1',
        conversationId: 'conv-1',
        type: 'text',
        content: 'Pending message',
        imageLocalUri: null,
        createdAt: Date.now(),
      });

      await pendingRepo.delete('local-1');

      const count = await pendingRepo.count();
      expect(count).toBe(0);
    });

    it('should count pending messages', async () => {
      await pendingRepo.add({
        localId: 'local-1',
        conversationId: 'conv-1',
        type: 'text',
        content: 'Message 1',
        imageLocalUri: null,
        createdAt: Date.now(),
      });

      await pendingRepo.add({
        localId: 'local-2',
        conversationId: 'conv-1',
        type: 'text',
        content: 'Message 2',
        imageLocalUri: null,
        createdAt: Date.now(),
      });

      const count = await pendingRepo.count();
      expect(count).toBe(2);
    });
  });

  describe('Cross-Repository Operations', () => {
    it('should maintain referential integrity across tables', async () => {
      // Create conversation
      await conversationRepo.upsert({
        id: 'conv-1',
        type: 'direct',
        name: null,
        participants: ['user-1', 'user-2'],
        lastMessage: 'Hello',
        lastMessageTimestamp: new Date(),
        groupPictureURL: null,
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      // Add messages to conversation
      await messageRepo.upsert({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Hello',
        imageURL: null,
        timestamp: new Date(),
        status: 'sent',
        deliveredTo: [],
        readBy: [],
        localId: null,
      });

      // Verify both exist
      const conversations = await conversationRepo.getForUser('user-1');
      const messages = await messageRepo.getByConversation('conv-1');

      expect(conversations).toHaveLength(1);
      expect(messages).toHaveLength(1);
      expect(messages[0].conversationId).toBe(conversations[0].id);
    });
  });
});

