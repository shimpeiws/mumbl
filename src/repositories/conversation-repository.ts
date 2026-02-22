import type Database from 'better-sqlite3';
import { toUnixSeconds } from '../utils/date.js';
import type { ConversationRow } from './types.js';

/**
 * Conversation domain object
 */
export interface Conversation {
  id: string;
  title: string | null;
  startedAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
  metadata: Record<string, unknown>;
}

/**
 * Convert database row to Conversation
 */
function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    startedAt: new Date(row.started_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
    status: row.status,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
  };
}

/**
 * Conversation repository interface
 */
export interface ConversationRepositoryInterface {
  insert(conversation: Conversation): void;
  findById(id: string): Conversation | null;
  findAll(options?: { limit?: number; offset?: number }): Conversation[];
  findActive(): Conversation[];
  update(id: string, updates: Partial<Pick<Conversation, 'title' | 'status' | 'metadata'>>): void;
  archive(id: string): void;
  delete(id: string): boolean;
}

/**
 * Create a conversation repository
 */
export function createConversationRepository(
  db: Database.Database,
): ConversationRepositoryInterface {
  const insert = (conversation: Conversation): void => {
    const stmt = db.prepare(`
      INSERT INTO conversations (id, title, started_at, updated_at, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      conversation.id,
      conversation.title,
      toUnixSeconds(conversation.startedAt),
      toUnixSeconds(conversation.updatedAt),
      conversation.status,
      JSON.stringify(conversation.metadata),
    );
  };

  const findById = (id: string): Conversation | null => {
    const stmt = db.prepare(`
      SELECT id, title, started_at, updated_at, status, metadata
      FROM conversations
      WHERE id = ?
    `);

    const row = stmt.get(id) as ConversationRow | undefined;
    return row ? rowToConversation(row) : null;
  };

  const findAll = (options?: { limit?: number; offset?: number }): Conversation[] => {
    let sql = `
      SELECT id, title, started_at, updated_at, status, metadata
      FROM conversations
      ORDER BY updated_at DESC
    `;

    const params: number[] = [];

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as ConversationRow[];
    return rows.map(rowToConversation);
  };

  const findActive = (): Conversation[] => {
    const stmt = db.prepare(`
      SELECT id, title, started_at, updated_at, status, metadata
      FROM conversations
      WHERE status = 'active'
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all() as ConversationRow[];
    return rows.map(rowToConversation);
  };

  const update = (
    id: string,
    updates: Partial<Pick<Conversation, 'title' | 'status' | 'metadata'>>,
  ): void => {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    fields.push('updated_at = ?');
    params.push(toUnixSeconds(new Date()));

    params.push(id);

    const sql = `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);
  };

  const archive = (id: string): void => {
    update(id, { status: 'archived' });
  };

  const deleteConversation = (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM conversations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  };

  return {
    insert,
    findById,
    findAll,
    findActive,
    update,
    archive,
    delete: deleteConversation,
  };
}
