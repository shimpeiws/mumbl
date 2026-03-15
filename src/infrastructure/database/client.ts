import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DatabaseError } from '../errors/DomainErrors.js';
import { initializeSchema } from './schema.js';

/**
 * Default storage directory
 */
export const DEFAULT_STORAGE_DIR = path.join(os.homedir(), '.mumbl');

/**
 * Default database filename
 */
export const DEFAULT_DB_FILE = 'mumbl.db';

/**
 * Get database path
 */
export function getDatabasePath(dir = DEFAULT_STORAGE_DIR, file = DEFAULT_DB_FILE): string {
  return path.join(dir, file);
}

/**
 * Ensure storage directory exists
 */
export function ensureStorageDir(dir = DEFAULT_STORAGE_DIR): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Initialize database with WAL mode and proper configuration
 */
export function initializeDatabase(dbPath?: string): Database.Database {
  try {
    const dbFilePath = dbPath ?? getDatabasePath();

    ensureStorageDir(dbPath ? path.dirname(dbFilePath) : undefined);

    const db = new Database(dbFilePath);

    db.pragma('journal_mode = WAL');

    db.pragma('busy_timeout = 5000');

    db.pragma('foreign_keys = ON');

    db.pragma('synchronous = NORMAL');

    initializeSchema(db);

    return db;
  } catch (error) {
    throw new DatabaseError(
      'Failed to initialize database',
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Singleton database instance
 */
let dbInstance: Database.Database | null = null;

/**
 * Get singleton database instance
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

/**
 * Close database connection (for testing)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
