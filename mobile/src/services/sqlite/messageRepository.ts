import { Message } from '@messageai/shared';
import { db } from './database';

export class MessageRepository {
  /**
   * Insert or update a single message
   */
  async upsert(message: Message): Promise<void> {
    db.runSync(
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

  /**
   * Insert multiple messages in a single transaction
   */
  async bulkUpsert(messages: Message[]): Promise<void> {
    if (messages.length === 0) return;

    db.withTransactionSync(() => {
      for (const message of messages) {
        db.runSync(
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
    });
  }

  /**
   * Replace all messages for a conversation (delete old, insert new)
   * This ensures the cache exactly matches Firestore
   */
  async replaceForConversation(conversationId: string, messages: Message[]): Promise<void> {
    db.withTransactionSync(() => {
      // Delete all existing messages for this conversation
      db.runSync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
      
      // Insert new messages
      for (const message of messages) {
        db.runSync(
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

  /**
   * Get all messages for a conversation
   */
  async getByConversation(conversationId: string): Promise<Message[]> {
    const rows = db.getAllSync<{
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

  /**
   * Update message status
   */
  async updateStatus(messageId: string, status: 'sent' | 'delivered' | 'read' | 'failed'): Promise<void> {
    db.runSync(
      'UPDATE messages SET status = ?, synced_at = ? WHERE id = ?',
      [status, Date.now(), messageId]
    );
  }

  /**
   * Delete all messages for a conversation
   */
  async deleteByConversation(conversationId: string): Promise<void> {
    db.runSync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  }

  /**
   * Delete all messages (for testing/cleanup)
   */
  async deleteAll(): Promise<void> {
    db.runSync('DELETE FROM messages');
  }
}

export const messageRepository = new MessageRepository();

