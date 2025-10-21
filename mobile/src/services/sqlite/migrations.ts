import * as SQLite from 'expo-sqlite';

const CURRENT_VERSION = 1;

const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_picture_url TEXT,
  is_online INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL,
  fcm_token TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER NOT NULL DEFAULT 0
);
`;

const CONVERSATIONS_TABLE_SQL = `
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
);
`;

const CONVERSATIONS_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
ON conversations(last_message_timestamp DESC);
`;

const MESSAGES_TABLE_SQL = `
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
  synced_at INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
`;

const MESSAGES_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp 
   ON messages(conversation_id, timestamp ASC);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_local_id 
   ON messages(local_id) WHERE local_id IS NOT NULL;`,
];

const PENDING_MESSAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS pending_messages (
  local_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text', 'image')),
  content TEXT NOT NULL,
  image_local_uri TEXT,
  created_at INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
`;

const PENDING_MESSAGES_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_pending_messages_conversation 
ON pending_messages(conversation_id, created_at ASC);
`;

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Check current version
    const result = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = result?.user_version || 0;
    
    console.log(`SQLite current version: ${currentVersion}, target: ${CURRENT_VERSION}`);
    
    if (currentVersion < CURRENT_VERSION) {
      // Run migrations in a transaction
      db.withTransactionSync(() => {
        if (currentVersion < 1) {
          console.log('Running migration 1: Initial schema');
          
          // Create tables
          db.execSync(USERS_TABLE_SQL);
          db.execSync(CONVERSATIONS_TABLE_SQL);
          db.execSync(CONVERSATIONS_INDEX_SQL);
          db.execSync(MESSAGES_TABLE_SQL);
          MESSAGES_INDEXES_SQL.forEach(sql => db.execSync(sql));
          db.execSync(PENDING_MESSAGES_TABLE_SQL);
          db.execSync(PENDING_MESSAGES_INDEX_SQL);
        }
        
        // Update version
        db.execSync(`PRAGMA user_version = ${CURRENT_VERSION}`);
      });
      
      console.log(`SQLite migrated to version ${CURRENT_VERSION}`);
    } else {
      console.log('SQLite schema up to date');
    }
    
    console.log('✅ SQLite migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

