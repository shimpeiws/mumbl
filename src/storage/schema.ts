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
 * Schema version for future migrations
 */
export const SCHEMA_VERSION = 1;

/**
 * Initialize database schema
 * Creates tables and indexes if they don't exist
 */
export function initializeSchema(db: { exec: (sql: string) => void }): void {
  db.exec(CREATE_ENTRIES_TABLE);
  db.exec(CREATE_TIMESTAMP_INDEX);
  db.exec(CREATE_CREATED_AT_INDEX);

  // Store schema version for future migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  // Insert version if not exists
  db.exec(`
    INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION})
  `);
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
