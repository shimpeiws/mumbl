import { randomUUID } from 'node:crypto';
/**
 * Repository for user context data
 */
import type Database from 'better-sqlite3';
import { toUnixSeconds } from '../utils/date.js';
import type { UserContextRow } from './types.js';

export interface UserContextRepositoryInterface {
  upsert(item: {
    contextType: string;
    key: string;
    value: string;
    confidence: number;
    sourceCount: number;
  }): UserContextRow;
  findByTypeAndKey(contextType: string, key: string): UserContextRow | null;
  findAll(options?: {
    type?: string;
    minConfidence?: number;
    includePrivate?: boolean;
  }): UserContextRow[];
  update(
    id: string,
    updates: Partial<{
      value: string;
      confidence: number;
      sourceCount: number;
      lastUpdated: number;
      isPrivate: number;
    }>,
  ): void;
  delete(id: string): boolean;
  applyDecay(rate: number): void;
  count(): number;
}

export function createUserContextRepository(db: Database.Database): UserContextRepositoryInterface {
  const findByTypeAndKey = (contextType: string, key: string): UserContextRow | null => {
    const stmt = db.prepare(
      `SELECT id, context_type, key, value, confidence, source_count,
              first_derived, last_updated, is_private
       FROM user_context
       WHERE context_type = ? AND key = ?`,
    );
    const row = stmt.get(contextType, key) as UserContextRow | undefined;
    return row ?? null;
  };

  const upsert = (item: {
    contextType: string;
    key: string;
    value: string;
    confidence: number;
    sourceCount: number;
  }): UserContextRow => {
    const existing = findByTypeAndKey(item.contextType, item.key);
    const now = toUnixSeconds(new Date());

    if (existing) {
      const newConfidence = Math.min(1.0, existing.confidence + item.confidence * 0.3);
      const newSourceCount = existing.source_count + 1;

      const stmt = db.prepare(
        `UPDATE user_context
         SET value = ?, confidence = ?, source_count = ?, last_updated = ?
         WHERE id = ?`,
      );
      stmt.run(item.value, newConfidence, newSourceCount, now, existing.id);

      return {
        ...existing,
        value: item.value,
        confidence: newConfidence,
        source_count: newSourceCount,
        last_updated: now,
      };
    }

    const id = randomUUID();
    const stmt = db.prepare(
      `INSERT INTO user_context
       (id, context_type, key, value, confidence, source_count,
        first_derived, last_updated, is_private)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    );
    stmt.run(
      id,
      item.contextType,
      item.key,
      item.value,
      item.confidence,
      item.sourceCount,
      now,
      now,
    );

    return {
      id,
      context_type: item.contextType,
      key: item.key,
      value: item.value,
      confidence: item.confidence,
      source_count: item.sourceCount,
      first_derived: now,
      last_updated: now,
      is_private: 0,
    };
  };

  const findAll = (options?: {
    type?: string;
    minConfidence?: number;
    includePrivate?: boolean;
  }): UserContextRow[] => {
    let sql = `SELECT id, context_type, key, value, confidence, source_count,
                      first_derived, last_updated, is_private
               FROM user_context`;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.type) {
      conditions.push('context_type = ?');
      params.push(options.type);
    }

    if (options?.minConfidence !== undefined) {
      conditions.push('confidence >= ?');
      params.push(options.minConfidence);
    }

    if (!options?.includePrivate) {
      conditions.push('is_private = 0');
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY confidence DESC, last_updated DESC';

    const stmt = db.prepare(sql);
    return stmt.all(...params) as UserContextRow[];
  };

  const update = (
    id: string,
    updates: Partial<{
      value: string;
      confidence: number;
      sourceCount: number;
      lastUpdated: number;
      isPrivate: number;
    }>,
  ): void => {
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (updates.value !== undefined) {
      fields.push('value = ?');
      params.push(updates.value);
    }
    if (updates.confidence !== undefined) {
      fields.push('confidence = ?');
      params.push(updates.confidence);
    }
    if (updates.sourceCount !== undefined) {
      fields.push('source_count = ?');
      params.push(updates.sourceCount);
    }
    if (updates.lastUpdated !== undefined) {
      fields.push('last_updated = ?');
      params.push(updates.lastUpdated);
    }
    if (updates.isPrivate !== undefined) {
      fields.push('is_private = ?');
      params.push(updates.isPrivate);
    }

    if (fields.length === 0) return;

    params.push(id);
    const stmt = db.prepare(`UPDATE user_context SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...params);
  };

  const deleteItem = (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM user_context WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  };

  const applyDecay = (rate: number): void => {
    const stmt = db.prepare('UPDATE user_context SET confidence = confidence * ?');
    stmt.run(rate);
  };

  const count = (): number => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM user_context');
    const row = stmt.get() as { count: number };
    return row.count;
  };

  return {
    upsert,
    findByTypeAndKey,
    findAll,
    update,
    delete: deleteItem,
    applyDecay,
    count,
  };
}
