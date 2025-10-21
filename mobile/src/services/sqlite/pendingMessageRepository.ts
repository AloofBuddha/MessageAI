import { db } from './database';

export interface PendingMessage {
  localId: string;
  conversationId: string;
  type: 'text' | 'image';
  content: string;
  imageLocalUri: string | null;
  createdAt: number;
  retryCount: number;
  lastAttemptAt: number | null;
}

export class PendingMessageRepository {
  /**
   * Add a message to the pending queue
   */
  async add(pendingMessage: Omit<PendingMessage, 'retryCount' | 'lastAttemptAt'>): Promise<void> {
    db.runSync(
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

  /**
   * Get all pending messages
   */
  async getAll(): Promise<PendingMessage[]> {
    const rows = db.getAllSync<{
      local_id: string;
      conversation_id: string;
      type: 'text' | 'image';
      content: string;
      image_local_uri: string | null;
      created_at: number;
      retry_count: number;
      last_attempt_at: number | null;
    }>(
      'SELECT * FROM pending_messages ORDER BY created_at ASC'
    );

    return rows.map((row) => ({
      localId: row.local_id,
      conversationId: row.conversation_id,
      type: row.type,
      content: row.content,
      imageLocalUri: row.image_local_uri,
      createdAt: row.created_at,
      retryCount: row.retry_count,
      lastAttemptAt: row.last_attempt_at,
    }));
  }

  /**
   * Get pending messages for a specific conversation
   */
  async getByConversation(conversationId: string): Promise<PendingMessage[]> {
    const rows = db.getAllSync<{
      local_id: string;
      conversation_id: string;
      type: 'text' | 'image';
      content: string;
      image_local_uri: string | null;
      created_at: number;
      retry_count: number;
      last_attempt_at: number | null;
    }>(
      'SELECT * FROM pending_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );

    return rows.map((row) => ({
      localId: row.local_id,
      conversationId: row.conversation_id,
      type: row.type,
      content: row.content,
      imageLocalUri: row.image_local_uri,
      createdAt: row.created_at,
      retryCount: row.retry_count,
      lastAttemptAt: row.last_attempt_at,
    }));
  }

  /**
   * Increment retry count for a pending message
   */
  async incrementRetry(localId: string): Promise<void> {
    db.runSync(
      'UPDATE pending_messages SET retry_count = retry_count + 1, last_attempt_at = ? WHERE local_id = ?',
      [Date.now(), localId]
    );
  }

  /**
   * Delete a pending message (after successful send)
   */
  async delete(localId: string): Promise<void> {
    db.runSync('DELETE FROM pending_messages WHERE local_id = ?', [localId]);
  }

  /**
   * Delete all pending messages (for testing/cleanup)
   */
  async deleteAll(): Promise<void> {
    db.runSync('DELETE FROM pending_messages');
  }

  /**
   * Get count of pending messages
   */
  async count(): Promise<number> {
    const result = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_messages'
    );
    return result?.count || 0;
  }
}

export const pendingMessageRepository = new PendingMessageRepository();

