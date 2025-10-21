/**
 * Test utilities for SQLite integration tests
 * Creates a real in-memory SQLite database for testing
 */
import Database from 'better-sqlite3';

export interface TestDatabase {
  runSync: (sql: string, params?: any[]) => void;
  getAllSync: <T>(sql: string, params?: any[]) => T[];
  getFirstSync: <T>(sql: string, params?: any[]) => T | null;
  execSync: (sql: string) => void;
  withTransactionSync: (callback: () => void) => void;
  close: () => void;
}

/**
 * Create a new in-memory SQLite database for testing
 */
export function createTestDatabase(): TestDatabase {
  // Create in-memory database
  const db = new Database(':memory:');

  return {
    runSync: (sql: string, params: any[] = []) => {
      const stmt = db.prepare(sql);
      stmt.run(...params);
    },

    getAllSync: <T>(sql: string, params: any[] = []): T[] => {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T[];
    },

    getFirstSync: <T>(sql: string, params: any[] = []): T | null => {
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return result ? (result as T) : null;
    },

    execSync: (sql: string) => {
      db.exec(sql);
    },

    withTransactionSync: (callback: () => void) => {
      const transaction = db.transaction(callback);
      transaction();
    },

    close: () => {
      db.close();
    },
  };
}

/**
 * Initialize database schema for testing
 */
export function initializeTestSchema(db: TestDatabase): void {
  // Users table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      profile_picture_url TEXT,
      is_online INTEGER NOT NULL DEFAULT 0,
      last_seen INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      synced_at INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Conversations table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
      name TEXT,
      participants TEXT NOT NULL,
      last_message TEXT,
      last_message_timestamp INTEGER,
      group_picture_url TEXT,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      synced_at INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Messages table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'image')),
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
      delivered_to TEXT NOT NULL DEFAULT '[]',
      read_by TEXT NOT NULL DEFAULT '[]',
      local_id TEXT,
      synced_at INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Pending messages table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pending_messages (
      local_id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'image')),
      content TEXT NOT NULL,
      image_local_uri TEXT,
      created_at INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at INTEGER
    )
  `);

  // Set initial schema version
  db.execSync('PRAGMA user_version = 1');
}

/**
 * Clean up all tables in the database
 */
export function cleanupTestDatabase(db: TestDatabase): void {
  db.execSync('DELETE FROM pending_messages');
  db.execSync('DELETE FROM messages');
  db.execSync('DELETE FROM conversations');
  db.execSync('DELETE FROM users');
}

