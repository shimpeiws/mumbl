/**
 * SQL schema for journal entries table
 */
export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`;

/**
 * Index on timestamp for efficient date-based queries
 */
export const CREATE_TIMESTAMP_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_timestamp ON entries(timestamp)
`;

/**
 * Index on created_at for sorting by creation time
 */
export const CREATE_CREATED_AT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_created_at ON entries(created_at)
`;

/**
 * SQL schema for reactions table
 */
export const CREATE_REACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  )
`;

/**
 * Index on entry_id for efficient lookups
 */
export const CREATE_REACTIONS_ENTRY_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_reactions_entry_id ON reactions(entry_id)
`;

/**
 * Schema version for future migrations
 */
export const SCHEMA_VERSION = 2;

/**
 * Initialize database schema
 * Creates tables and indexes if they don't exist
 */
export function initializeSchema(db: {
  exec: (sql: string) => void;
  prepare: (sql: string) => { get: () => { version: number } | undefined };
}): void {
  db.exec(CREATE_ENTRIES_TABLE);
  db.exec(CREATE_TIMESTAMP_INDEX);
  db.exec(CREATE_CREATED_AT_INDEX);
  db.exec(CREATE_REACTIONS_TABLE);
  db.exec(CREATE_REACTIONS_ENTRY_INDEX);

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  db.exec(`
    INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION})
  `);

  // Run any pending migrations for existing databases
  runMigrations(db);
}

/**
 * Get current schema version
 */
export function getSchemaVersion(db: {
  prepare: (sql: string) => { get: () => { version: number } | undefined };
}): number {
  const stmt = db.prepare('SELECT version FROM schema_version LIMIT 1');
  const row = stmt.get();
  return row?.version ?? 0;
}

/**
 * Migrate from version 1 to version 2
 * Adds reactions table
 */
export function migrateToVersion2(db: { exec: (sql: string) => void }): void {
  db.exec(CREATE_REACTIONS_TABLE);
  db.exec(CREATE_REACTIONS_ENTRY_INDEX);
}

/**
 * Run any pending migrations
 */
export function runMigrations(db: {
  exec: (sql: string) => void;
  prepare: (sql: string) => { get: () => { version: number } | undefined };
}): void {
  const currentVersion = getSchemaVersion(db);

  if (currentVersion < 2) {
    migrateToVersion2(db);
    db.exec('UPDATE schema_version SET version = 2');
  }
}
