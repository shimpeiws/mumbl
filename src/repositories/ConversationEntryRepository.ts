import type Database from 'better-sqlite3';
import type { ConversationEntryRow } from './types.js';

/**
 * Conversation entry link domain object
 */
export interface ConversationEntry {
  conversationId: string;
  entryId: string;
  position: number;
  createdAt: Date;
}

/**
 * Convert database row to ConversationEntry
 */
function rowToConversationEntry(row: ConversationEntryRow): ConversationEntry {
  return {
    conversationId: row.conversation_id,
    entryId: row.entry_id,
    position: row.position,
    createdAt: new Date(row.created_at * 1000),
  };
}

/**
 * Conversation entry repository interface
 */
export interface ConversationEntryRepositoryInterface {
  addEntry(conversationId: string, entryId: string, position: number): void;
  getEntriesForConversation(conversationId: string): ConversationEntry[];
  getConversationForEntry(entryId: string): string | null;
  removeEntry(conversationId: string, entryId: string): boolean;
  getNextPosition(conversationId: string): number;
}

/**
 * Create a conversation entry repository
 */
export function createConversationEntryRepository(
  db: Database.Database,
): ConversationEntryRepositoryInterface {
  const addEntry = (conversationId: string, entryId: string, position: number): void => {
    const stmt = db.prepare(`
      INSERT INTO conversation_entries (conversation_id, entry_id, position)
      VALUES (?, ?, ?)
    `);

    stmt.run(conversationId, entryId, position);
  };

  const getEntriesForConversation = (conversationId: string): ConversationEntry[] => {
    const stmt = db.prepare(`
      SELECT conversation_id, entry_id, position, created_at
      FROM conversation_entries
      WHERE conversation_id = ?
      ORDER BY position ASC
    `);

    const rows = stmt.all(conversationId) as ConversationEntryRow[];
    return rows.map(rowToConversationEntry);
  };

  const getConversationForEntry = (entryId: string): string | null => {
    const stmt = db.prepare(`
      SELECT conversation_id
      FROM conversation_entries
      WHERE entry_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(entryId) as { conversation_id: string } | undefined;
    return row?.conversation_id ?? null;
  };

  const removeEntry = (conversationId: string, entryId: string): boolean => {
    const stmt = db.prepare(`
      DELETE FROM conversation_entries
      WHERE conversation_id = ? AND entry_id = ?
    `);

    const result = stmt.run(conversationId, entryId);
    return result.changes > 0;
  };

  const getNextPosition = (conversationId: string): number => {
    const stmt = db.prepare(`
      SELECT MAX(position) as max_position
      FROM conversation_entries
      WHERE conversation_id = ?
    `);

    const row = stmt.get(conversationId) as { max_position: number | null } | undefined;
    return (row?.max_position ?? -1) + 1;
  };

  return {
    addEntry,
    getEntriesForConversation,
    getConversationForEntry,
    removeEntry,
    getNextPosition,
  };
}
