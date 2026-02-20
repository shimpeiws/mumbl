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
 * SQL schema for conversations table
 */
export const CREATE_CONVERSATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    started_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata TEXT
  )
`;

/**
 * SQL schema for conversation_entries junction table
 */
export const CREATE_CONVERSATION_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS conversation_entries (
    conversation_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (conversation_id, entry_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  )
`;

/**
 * SQL schema for conversation_memory table
 */
export const CREATE_CONVERSATION_MEMORY_TABLE = `
  CREATE TABLE IF NOT EXISTS conversation_memory (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )
`;

/**
 * Index on conversation_entries for efficient lookups
 */
export const CREATE_CONVERSATION_ENTRIES_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_conversation_entries_conv_id
  ON conversation_entries(conversation_id)
`;

/**
 * Index on conversation_memory for efficient lookups
 */
export const CREATE_CONVERSATION_MEMORY_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_conversation_memory_conv_id
  ON conversation_memory(conversation_id)
`;

/**
 * Schema version for future migrations
 */
export const SCHEMA_VERSION = 3;

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
  db.exec(CREATE_CONVERSATIONS_TABLE);
  db.exec(CREATE_CONVERSATION_ENTRIES_TABLE);
  db.exec(CREATE_CONVERSATION_MEMORY_TABLE);
  db.exec(CREATE_CONVERSATION_ENTRIES_INDEX);
  db.exec(CREATE_CONVERSATION_MEMORY_INDEX);

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
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
 * Migrate from version 2 to version 3
 * Adds conversations, conversation_entries, and conversation_memory tables
 */
export function migrateToVersion3(db: { exec: (sql: string) => void }): void {
  db.exec(CREATE_CONVERSATIONS_TABLE);
  db.exec(CREATE_CONVERSATION_ENTRIES_TABLE);
  db.exec(CREATE_CONVERSATION_MEMORY_TABLE);
  db.exec(CREATE_CONVERSATION_ENTRIES_INDEX);
  db.exec(CREATE_CONVERSATION_MEMORY_INDEX);
}

/**
 * Run any pending migrations
 */
export function runMigrations(db: {
  exec: (sql: string) => void;
  prepare: (sql: string) => { get: () => { version: number } | undefined };
}): void {
  const currentVersion = getSchemaVersion(db);

  // New database - insert initial version
  if (currentVersion === 0) {
    db.exec(`INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION})`);
    return;
  }

  // Run migrations for existing databases
  if (currentVersion < 2) {
    migrateToVersion2(db);
    db.exec('DELETE FROM schema_version');
    db.exec('INSERT INTO schema_version (version) VALUES (2)');
  }

  if (currentVersion < 3) {
    migrateToVersion3(db);
    db.exec('DELETE FROM schema_version');
    db.exec('INSERT INTO schema_version (version) VALUES (3)');
  }
}
