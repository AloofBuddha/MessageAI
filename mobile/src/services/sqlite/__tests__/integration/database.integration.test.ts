import { createTestDatabase, initializeTestSchema, TestDatabase } from './testDatabase';

describe('Database Integration Tests', () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe('Schema Initialization', () => {
    it('should create all required tables', () => {
      initializeTestSchema(db);

      // Verify tables exist by querying sqlite_master
      const tables = db.getAllSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('conversations');
      expect(tableNames).toContain('messages');
      expect(tableNames).toContain('pending_messages');
    });

    it('should set schema version', () => {
      initializeTestSchema(db);

      const result = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
      expect(result?.user_version).toBe(1);
    });
  });

  describe('Table Constraints', () => {
    beforeEach(() => {
      initializeTestSchema(db);
    });

    it('should enforce unique email constraint on users', () => {
      db.runSync(
        'INSERT INTO users (id, email, display_name, is_online, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['user-1', 'test@example.com', 'Test User', 0, Date.now(), Date.now()]
      );

      // Try to insert duplicate email
      expect(() => {
        db.runSync(
          'INSERT INTO users (id, email, display_name, is_online, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-2', 'test@example.com', 'Test User 2', 0, Date.now(), Date.now()]
        );
      }).toThrow();
    });

    it('should enforce message status check constraint', () => {
      expect(() => {
        db.runSync(
          'INSERT INTO messages (id, conversation_id, sender_id, type, content, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['msg-1', 'conv-1', 'user-1', 'text', 'Hello', Date.now(), 'invalid-status']
        );
      }).toThrow();
    });

    it('should enforce conversation type check constraint', () => {
      expect(() => {
        db.runSync(
          'INSERT INTO conversations (id, type, participants, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
          ['conv-1', 'invalid-type', '[]', Date.now(), 'user-1']
        );
      }).toThrow();
    });
  });

  describe('Transactions', () => {
    beforeEach(() => {
      initializeTestSchema(db);
    });

    it('should commit successful transactions', () => {
      db.withTransactionSync(() => {
        db.runSync(
          'INSERT INTO users (id, email, display_name, is_online, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-1', 'test@example.com', 'Test User', 0, Date.now(), Date.now()]
        );
        db.runSync(
          'INSERT INTO users (id, email, display_name, is_online, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ['user-2', 'test2@example.com', 'Test User 2', 0, Date.now(), Date.now()]
        );
      });

      const users = db.getAllSync('SELECT * FROM users');
      expect(users).toHaveLength(2);
    });

    it('should rollback failed transactions', () => {
      try {
        db.withTransactionSync(() => {
          db.runSync(
            'INSERT INTO users (id, email, display_name, is_online, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['user-1', 'test@example.com', 'Test User', 0, Date.now(), Date.now()]
          );
          // This should fail due to duplicate email
          db.runSync(
            'INSERT INTO users (id, email, display_name, is_online, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ['user-2', 'test@example.com', 'Test User 2', 0, Date.now(), Date.now()]
          );
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify no users were inserted (transaction rolled back)
      const users = db.getAllSync('SELECT * FROM users');
      expect(users).toHaveLength(0);
    });
  });
});

