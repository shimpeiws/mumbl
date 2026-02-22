import type Database from 'better-sqlite3';
import { toUnixSeconds } from '../utils/date.js';
import type { Reaction, ReactionRow, ReactionType } from './types.js';

/**
 * Convert database row to Reaction
 */
function rowToReaction(row: ReactionRow): Reaction {
  return {
    id: row.id,
    entryId: row.entry_id,
    reactionType: row.reaction_type as ReactionType,
    content: row.content,
    createdAt: new Date(row.created_at * 1000),
  };
}

/**
 * Reaction repository interface
 */
export interface ReactionRepositoryInterface {
  insert(reaction: Reaction): void;
  findByEntryId(entryId: string): Reaction | null;
  findByEntryIds(entryIds: string[]): Map<string, Reaction>;
  deleteByEntryId(entryId: string): boolean;
  delete(id: string): boolean;
  count(): number;
}

/**
 * Create a reaction repository
 */
export function createReactionRepository(db: Database.Database): ReactionRepositoryInterface {
  const insert = (reaction: Reaction): void => {
    const stmt = db.prepare(`
      INSERT INTO reactions (id, entry_id, reaction_type, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      reaction.id,
      reaction.entryId,
      reaction.reactionType,
      reaction.content,
      toUnixSeconds(reaction.createdAt),
    );
  };

  const findByEntryId = (entryId: string): Reaction | null => {
    const stmt = db.prepare(`
      SELECT id, entry_id, reaction_type, content, created_at
      FROM reactions
      WHERE entry_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(entryId) as ReactionRow | undefined;
    return row ? rowToReaction(row) : null;
  };

  const findByEntryIds = (entryIds: string[]): Map<string, Reaction> => {
    if (entryIds.length === 0) {
      return new Map();
    }

    const placeholders = entryIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT id, entry_id, reaction_type, content, created_at
      FROM reactions
      WHERE entry_id IN (${placeholders})
    `);

    const rows = stmt.all(...entryIds) as ReactionRow[];

    const reactionMap = new Map<string, Reaction>();
    for (const row of rows) {
      reactionMap.set(row.entry_id, rowToReaction(row));
    }
    return reactionMap;
  };

  const deleteByEntryId = (entryId: string): boolean => {
    const stmt = db.prepare('DELETE FROM reactions WHERE entry_id = ?');
    const result = stmt.run(entryId);
    return result.changes > 0;
  };

  const deleteReaction = (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM reactions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  };

  const count = (): number => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM reactions');
    const row = stmt.get() as { count: number };
    return row.count;
  };

  return {
    insert,
    findByEntryId,
    findByEntryIds,
    deleteByEntryId,
    delete: deleteReaction,
    count,
  };
}
