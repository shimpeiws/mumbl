import type Database from 'better-sqlite3';
import { EntryNotFoundError, InvalidEntryError } from '../infrastructure/errors/domain-errors.js';
import type { EntryRow, JournalEntry } from './types.js';

/**
 * Convert Date to Unix timestamp in seconds
 */
function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Repository for journal entry database operations
 */
export class EntryRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to JournalEntry
   */
  private rowToEntry(row: EntryRow): JournalEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp * 1000),
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }

  /**
   * Insert a new entry into database
   */
  insert(entry: JournalEntry): void {
    if (!entry.id) {
      throw new InvalidEntryError('Entry ID is required');
    }
    if (!entry.content) {
      throw new InvalidEntryError('Entry content is required');
    }

    const stmt = this.db.prepare(`
      INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        entry.id,
        toUnixSeconds(entry.timestamp),
        entry.content,
        JSON.stringify(entry.metadata),
        toUnixSeconds(entry.createdAt),
        toUnixSeconds(entry.updatedAt),
      );
    } catch (error) {
      // better-sqlite3 errors have a 'code' property for SQLite error codes
      const sqliteError = error as { code?: string; message?: string };
      const isConstraintError =
        sqliteError.code?.includes('SQLITE_CONSTRAINT') ||
        sqliteError.message?.includes('UNIQUE constraint failed');
      if (isConstraintError) {
        throw new InvalidEntryError(`Entry with ID ${entry.id} already exists`);
      }
      throw error;
    }
  }

  /**
   * Find entry by ID
   */
  findById(id: string): JournalEntry | null {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, content, metadata, created_at, updated_at
      FROM entries
      WHERE id = ?
    `);

    const row = stmt.get(id) as EntryRow | undefined;
    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Find all entries with optional filters
   */
  findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    since?: Date;
    until?: Date;
  }): JournalEntry[] {
    const sortColumn =
      options?.sortBy === 'createdAt'
        ? 'created_at'
        : options?.sortBy === 'updatedAt'
          ? 'updated_at'
          : 'timestamp';
    const order = options?.order === 'asc' ? 'ASC' : 'DESC';

    let sql = `
      SELECT id, timestamp, content, metadata, created_at, updated_at
      FROM entries
    `;

    const params: (number | undefined)[] = [];

    const conditions: string[] = [];
    if (options?.since) {
      conditions.push('timestamp >= ?');
      params.push(toUnixSeconds(options.since));
    }
    if (options?.until) {
      conditions.push('timestamp <= ?');
      params.push(toUnixSeconds(options.until));
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY ${sortColumn} ${order}`;

    if (options?.limit || options?.offset) {
      sql += ' LIMIT ?';
      params.push(options?.limit ?? -1);
    }

    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as EntryRow[];

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Update existing entry
   */
  update(
    id: string,
    updates: {
      content?: string;
      metadata?: Record<string, unknown>;
      timestamp?: Date;
    },
  ): JournalEntry {
    const existing = this.findById(id);
    if (!existing) {
      throw new EntryNotFoundError(id);
    }

    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      params.push(updates.content);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (updates.timestamp !== undefined) {
      fields.push('timestamp = ?');
      params.push(toUnixSeconds(updates.timestamp));
    }

    fields.push('updated_at = ?');
    params.push(toUnixSeconds(new Date()));

    params.push(id);

    const sql = `
      UPDATE entries
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    const stmt = this.db.prepare(sql);
    stmt.run(...params);

    const updated = this.findById(id);
    if (!updated) {
      throw new EntryNotFoundError(id);
    }

    return updated;
  }

  /**
   * Delete entry by ID
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count total entries
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM entries');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  /**
   * Search entries by content (simple substring match)
   */
  search(query: string): JournalEntry[] {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, content, metadata, created_at, updated_at
      FROM entries
      WHERE content LIKE ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(`%${query}%`) as EntryRow[];
    return rows.map((row) => this.rowToEntry(row));
  }
}
