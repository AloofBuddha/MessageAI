import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('messageai.db');

export function initializeDatabase(): void {
  try {
    // Enable WAL mode for better concurrency
    db.execSync('PRAGMA journal_mode = WAL;');
    db.execSync('PRAGMA synchronous = NORMAL;');
    
    // Test connection
    const result = db.getFirstSync<{ test: number }>('SELECT 1 as test');
    
    if (result?.test === 1) {
      console.log('✅ SQLite database initialized successfully');
    } else {
      throw new Error('Database test query failed');
    }
  } catch (error) {
    console.error('❌ Failed to initialize SQLite:', error);
    throw error;
  }
}

