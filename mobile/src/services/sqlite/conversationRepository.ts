import { Conversation } from '@messageai/shared';
import { db } from './database';

export class ConversationRepository {
  /**
   * Insert or update a single conversation
   */
  async upsert(conversation: Conversation): Promise<void> {
    db.runSync(
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

  /**
   * Insert multiple conversations in a single transaction
   */
  async bulkUpsert(conversations: Conversation[]): Promise<void> {
    if (conversations.length === 0) return;

    db.withTransactionSync(() => {
      for (const conversation of conversations) {
        db.runSync(
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
    });
  }

  /**
   * Get all conversations for a user
   */
  async getForUser(userId: string): Promise<Conversation[]> {
    const rows = db.getAllSync<{
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

  /**
   * Get a single conversation by ID
   */
  async getById(conversationId: string): Promise<Conversation | null> {
    const row = db.getFirstSync<{
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
      'SELECT * FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      name: row.name,
      participants: JSON.parse(row.participants),
      lastMessage: row.last_message,
      lastMessageTimestamp: row.last_message_timestamp ? new Date(row.last_message_timestamp) : null,
      groupPictureURL: row.group_picture_url,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
    };
  }

  /**
   * Delete a conversation
   */
  async delete(conversationId: string): Promise<void> {
    db.runSync('DELETE FROM conversations WHERE id = ?', [conversationId]);
  }

  /**
   * Delete all conversations (for testing/cleanup)
   */
  async deleteAll(): Promise<void> {
    db.runSync('DELETE FROM conversations');
  }
}

export const conversationRepository = new ConversationRepository();

