/**
 * Repository for trend summary data
 */
import type Database from 'better-sqlite3';
import { toUnixSeconds } from '../utils/date.js';
import type { TrendSummaryRow } from './types.js';

export interface TrendSummaryRepositoryInterface {
  insert(summary: TrendSummaryRow): void;
  findByPeriod(periodType: string, start: Date, end: Date): TrendSummaryRow | null;
  findAll(options?: { limit?: number; offset?: number }): TrendSummaryRow[];
}

export function createTrendSummaryRepository(
  db: Database.Database,
): TrendSummaryRepositoryInterface {
  const insert = (summary: TrendSummaryRow): void => {
    const stmt = db.prepare(`
      INSERT INTO trend_summaries (id, period_type, period_start, period_end, content, topic_counts)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      summary.id,
      summary.period_type,
      summary.period_start,
      summary.period_end,
      summary.content,
      summary.topic_counts,
    );
  };

  const findByPeriod = (periodType: string, start: Date, end: Date): TrendSummaryRow | null => {
    const stmt = db.prepare(`
      SELECT id, period_type, period_start, period_end, content, topic_counts, created_at
      FROM trend_summaries
      WHERE period_type = ? AND period_start = ? AND period_end = ?
    `);
    const row = stmt.get(periodType, toUnixSeconds(start), toUnixSeconds(end)) as
      | TrendSummaryRow
      | undefined;
    return row ?? null;
  };

  const findAll = (options?: { limit?: number; offset?: number }): TrendSummaryRow[] => {
    let sql = `
      SELECT id, period_type, period_start, period_end, content, topic_counts, created_at
      FROM trend_summaries
      ORDER BY created_at DESC
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
    return stmt.all(...params) as TrendSummaryRow[];
  };

  return {
    insert,
    findByPeriod,
    findAll,
  };
}
