import { randomUUID } from 'node:crypto';
/**
 * Repository for topic and entry-topic data
 */
import type Database from 'better-sqlite3';
import { toUnixSeconds } from '../utils/date.js';
import type { TopicRow } from './types.js';

export interface TopicRepositoryInterface {
  upsert(name: string): TopicRow;
  findByName(name: string): TopicRow | null;
  findByNames(names: string[]): TopicRow[];
  findAll(options?: { limit?: number; offset?: number }): TopicRow[];
  incrementCount(id: string, lastSeen: Date): void;
  addEntryTopic(entryId: string, topicId: string, relevance: number): void;
  getTopicCountsForPeriod(start: Date, end: Date): Array<{ name: string; count: number }>;
  getTopTopics(limit: number): Array<{ topic: TopicRow; count: number }>;
}

export function createTopicRepository(db: Database.Database): TopicRepositoryInterface {
  const upsert = (name: string): TopicRow => {
    const existing = findByName(name);
    if (existing) {
      return existing;
    }

    const now = toUnixSeconds(new Date());
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO topics (id, name, first_seen, last_seen, total_count, metadata)
      VALUES (?, ?, ?, ?, 1, '{}')
    `);
    stmt.run(id, name, now, now);

    return {
      id,
      name,
      first_seen: now,
      last_seen: now,
      total_count: 1,
      metadata: '{}',
    };
  };

  const findByName = (name: string): TopicRow | null => {
    const stmt = db.prepare(
      'SELECT id, name, first_seen, last_seen, total_count, metadata FROM topics WHERE name = ?',
    );
    const row = stmt.get(name) as TopicRow | undefined;
    return row ?? null;
  };

  const findByNames = (names: string[]): TopicRow[] => {
    if (names.length === 0) return [];

    const placeholders = names.map(() => '?').join(',');
    const stmt = db.prepare(
      `SELECT id, name, first_seen, last_seen, total_count, metadata FROM topics WHERE name IN (${placeholders})`,
    );
    return stmt.all(...names) as TopicRow[];
  };

  const findAll = (options?: { limit?: number; offset?: number }): TopicRow[] => {
    let sql =
      'SELECT id, name, first_seen, last_seen, total_count, metadata FROM topics ORDER BY total_count DESC';
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
    return stmt.all(...params) as TopicRow[];
  };

  const incrementCount = (id: string, lastSeen: Date): void => {
    const stmt = db.prepare(
      'UPDATE topics SET total_count = total_count + 1, last_seen = ? WHERE id = ?',
    );
    stmt.run(toUnixSeconds(lastSeen), id);
  };

  const addEntryTopic = (entryId: string, topicId: string, relevance: number): void => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO entry_topics (entry_id, topic_id, relevance)
      VALUES (?, ?, ?)
    `);
    stmt.run(entryId, topicId, relevance);
  };

  const getTopicCountsForPeriod = (
    start: Date,
    end: Date,
  ): Array<{ name: string; count: number }> => {
    const stmt = db.prepare(`
      SELECT t.name, COUNT(et.entry_id) as count
      FROM topics t
      JOIN entry_topics et ON t.id = et.topic_id
      WHERE et.created_at >= ? AND et.created_at <= ?
      GROUP BY t.id, t.name
      ORDER BY count DESC
    `);
    return stmt.all(toUnixSeconds(start), toUnixSeconds(end)) as Array<{
      name: string;
      count: number;
    }>;
  };

  const getTopTopics = (limit: number): Array<{ topic: TopicRow; count: number }> => {
    const stmt = db.prepare(`
      SELECT t.id, t.name, t.first_seen, t.last_seen, t.total_count, t.metadata,
             t.total_count as count
      FROM topics t
      ORDER BY t.total_count DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as (TopicRow & { count: number })[];
    return rows.map((row) => ({
      topic: {
        id: row.id,
        name: row.name,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        total_count: row.total_count,
        metadata: row.metadata,
      },
      count: row.count,
    }));
  };

  return {
    upsert,
    findByName,
    findByNames,
    findAll,
    incrementCount,
    addEntryTopic,
    getTopicCountsForPeriod,
    getTopTopics,
  };
}
