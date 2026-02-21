import type Database from 'better-sqlite3';
import type { FollowUp, FollowUpStatus } from '../services/follow-up/types.js';
import type { FollowUpRow } from './types.js';

/**
 * Convert Date to Unix timestamp in seconds
 */
function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert database row to FollowUp
 */
function rowToFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    entryId: row.entry_id,
    scheduledAt: new Date(row.scheduled_at * 1000),
    intervalType: row.interval_type as FollowUp['intervalType'],
    status: row.status as FollowUpStatus,
    promptText: row.prompt_text,
    responseEntryId: row.response_entry_id,
    createdAt: new Date(row.created_at * 1000),
    shownAt: row.shown_at ? new Date(row.shown_at * 1000) : null,
  };
}

/**
 * Follow-up repository interface
 */
export interface FollowUpRepositoryInterface {
  insert(followUp: FollowUp): void;
  findById(id: string): FollowUp | null;
  findDue(now: Date): FollowUp[];
  findByEntryId(entryId: string): FollowUp[];
  update(
    id: string,
    fields: Partial<Pick<FollowUp, 'status' | 'shownAt' | 'responseEntryId' | 'promptText'>>,
  ): FollowUp | null;
  findAll(): FollowUp[];
}

/**
 * Create a follow-up repository
 */
export function createFollowUpRepository(db: Database.Database): FollowUpRepositoryInterface {
  const insert = (followUp: FollowUp): void => {
    const stmt = db.prepare(`
      INSERT INTO follow_ups (
        id, entry_id, scheduled_at, interval_type, status,
        prompt_text, response_entry_id, created_at, shown_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      followUp.id,
      followUp.entryId,
      toUnixSeconds(followUp.scheduledAt),
      followUp.intervalType,
      followUp.status,
      followUp.promptText,
      followUp.responseEntryId,
      toUnixSeconds(followUp.createdAt),
      followUp.shownAt ? toUnixSeconds(followUp.shownAt) : null,
    );
  };

  const findById = (id: string): FollowUp | null => {
    const stmt = db.prepare(`
      SELECT id, entry_id, scheduled_at, interval_type, status,
             prompt_text, response_entry_id, created_at, shown_at
      FROM follow_ups
      WHERE id = ?
    `);

    const row = stmt.get(id) as FollowUpRow | undefined;
    return row ? rowToFollowUp(row) : null;
  };

  const findDue = (now: Date): FollowUp[] => {
    const stmt = db.prepare(`
      SELECT id, entry_id, scheduled_at, interval_type, status,
             prompt_text, response_entry_id, created_at, shown_at
      FROM follow_ups
      WHERE scheduled_at <= ? AND status = 'pending'
      ORDER BY scheduled_at ASC
    `);

    const rows = stmt.all(toUnixSeconds(now)) as FollowUpRow[];
    return rows.map(rowToFollowUp);
  };

  const findByEntryId = (entryId: string): FollowUp[] => {
    const stmt = db.prepare(`
      SELECT id, entry_id, scheduled_at, interval_type, status,
             prompt_text, response_entry_id, created_at, shown_at
      FROM follow_ups
      WHERE entry_id = ?
      ORDER BY scheduled_at ASC
    `);

    const rows = stmt.all(entryId) as FollowUpRow[];
    return rows.map(rowToFollowUp);
  };

  const update = (
    id: string,
    fields: Partial<Pick<FollowUp, 'status' | 'shownAt' | 'responseEntryId' | 'promptText'>>,
  ): FollowUp | null => {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (fields.status !== undefined) {
      setClauses.push('status = ?');
      values.push(fields.status);
    }
    if (fields.shownAt !== undefined) {
      setClauses.push('shown_at = ?');
      values.push(fields.shownAt ? toUnixSeconds(fields.shownAt) : null);
    }
    if (fields.responseEntryId !== undefined) {
      setClauses.push('response_entry_id = ?');
      values.push(fields.responseEntryId);
    }
    if (fields.promptText !== undefined) {
      setClauses.push('prompt_text = ?');
      values.push(fields.promptText);
    }

    if (setClauses.length === 0) {
      return findById(id);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE follow_ups SET ${setClauses.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return findById(id);
  };

  const findAll = (): FollowUp[] => {
    const stmt = db.prepare(`
      SELECT id, entry_id, scheduled_at, interval_type, status,
             prompt_text, response_entry_id, created_at, shown_at
      FROM follow_ups
      ORDER BY scheduled_at ASC
    `);

    const rows = stmt.all() as FollowUpRow[];
    return rows.map(rowToFollowUp);
  };

  return {
    insert,
    findById,
    findDue,
    findByEntryId,
    update,
    findAll,
  };
}
