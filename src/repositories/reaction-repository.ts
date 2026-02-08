import type Database from 'better-sqlite3';
import type { Reaction, ReactionRow, ReactionType } from './types.js';

/**
 * Convert Date to Unix timestamp in seconds
 */
function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

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

/**
 * Legacy class export for backward compatibility
 * @deprecated Use createReactionRepository() instead
 */
export class ReactionRepository implements ReactionRepositoryInterface {
  private readonly _repo: ReactionRepositoryInterface;

  constructor(db: Database.Database) {
    this._repo = createReactionRepository(db);
  }

  insert(reaction: Reaction) {
    return this._repo.insert(reaction);
  }
  findByEntryId(entryId: string) {
    return this._repo.findByEntryId(entryId);
  }
  findByEntryIds(entryIds: string[]) {
    return this._repo.findByEntryIds(entryIds);
  }
  deleteByEntryId(entryId: string) {
    return this._repo.deleteByEntryId(entryId);
  }
  delete(id: string) {
    return this._repo.delete(id);
  }
  count() {
    return this._repo.count();
  }
}
