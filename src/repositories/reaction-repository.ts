import type Database from 'better-sqlite3';
import type { Reaction, ReactionRow, ReactionType } from './types.js';

/**
 * Convert Date to Unix timestamp in seconds
 */
function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Repository for reaction database operations
 */
export class ReactionRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to Reaction
   */
  private rowToReaction(row: ReactionRow): Reaction {
    return {
      id: row.id,
      entryId: row.entry_id,
      reactionType: row.reaction_type as ReactionType,
      content: row.content,
      createdAt: new Date(row.created_at * 1000),
    };
  }

  /**
   * Insert a new reaction into database
   */
  insert(reaction: Reaction): void {
    const stmt = this.db.prepare(`
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
  }

  /**
   * Find reaction by entry ID
   * Returns the most recent reaction for the entry
   */
  findByEntryId(entryId: string): Reaction | null {
    const stmt = this.db.prepare(`
      SELECT id, entry_id, reaction_type, content, created_at
      FROM reactions
      WHERE entry_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(entryId) as ReactionRow | undefined;
    return row ? this.rowToReaction(row) : null;
  }

  /**
   * Find reactions for multiple entries (batch query for efficiency)
   * Returns a Map of entryId -> Reaction
   */
  findByEntryIds(entryIds: string[]): Map<string, Reaction> {
    if (entryIds.length === 0) {
      return new Map();
    }

    const placeholders = entryIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT id, entry_id, reaction_type, content, created_at
      FROM reactions
      WHERE entry_id IN (${placeholders})
    `);

    const rows = stmt.all(...entryIds) as ReactionRow[];

    const reactionMap = new Map<string, Reaction>();
    for (const row of rows) {
      reactionMap.set(row.entry_id, this.rowToReaction(row));
    }
    return reactionMap;
  }

  /**
   * Delete reaction by entry ID
   */
  deleteByEntryId(entryId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM reactions WHERE entry_id = ?');
    const result = stmt.run(entryId);
    return result.changes > 0;
  }

  /**
   * Delete reaction by ID
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM reactions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count total reactions
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM reactions');
    const row = stmt.get() as { count: number };
    return row.count;
  }
}
