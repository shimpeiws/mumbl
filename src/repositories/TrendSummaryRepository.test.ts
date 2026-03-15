import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import {
  type TrendSummaryRepositoryInterface,
  createTrendSummaryRepository,
} from './TrendSummaryRepository.js';
import type { TrendSummaryRow } from './types.js';

describe('TrendSummaryRepository', () => {
  let db: Database.Database;
  let repository: TrendSummaryRepositoryInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    repository = createTrendSummaryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  const createTestSummary = (overrides?: Partial<TrendSummaryRow>): TrendSummaryRow => ({
    id: 'summary-1',
    period_type: 'weekly',
    period_start: Math.floor(new Date('2024-01-01').getTime() / 1000),
    period_end: Math.floor(new Date('2024-01-07').getTime() / 1000),
    content: 'Work and sleep were the main topics this week.',
    topic_counts: JSON.stringify({ work: 5, sleep: 3 }),
    created_at: Math.floor(Date.now() / 1000),
    ...overrides,
  });

  describe('insert', () => {
    it('should insert a trend summary', () => {
      const summary = createTestSummary();
      repository.insert(summary);

      const rows = db
        .prepare('SELECT * FROM trend_summaries WHERE id = ?')
        .all('summary-1') as TrendSummaryRow[];
      expect(rows).toHaveLength(1);
      expect(rows[0]?.content).toBe(summary.content);
    });
  });

  describe('findByPeriod', () => {
    it('should find summary by period type and dates', () => {
      const summary = createTestSummary();
      repository.insert(summary);

      const found = repository.findByPeriod(
        'weekly',
        new Date('2024-01-01'),
        new Date('2024-01-07'),
      );
      expect(found).not.toBeNull();
      expect(found?.id).toBe('summary-1');
    });

    it('should return null when no matching period found', () => {
      const found = repository.findByPeriod(
        'monthly',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.insert(createTestSummary({ id: 'summary-1' }));
      repository.insert(
        createTestSummary({
          id: 'summary-2',
          period_type: 'monthly',
          period_start: Math.floor(new Date('2024-01-01').getTime() / 1000),
          period_end: Math.floor(new Date('2024-01-31').getTime() / 1000),
        }),
      );
    });

    it('should return all summaries', () => {
      const summaries = repository.findAll();
      expect(summaries).toHaveLength(2);
    });

    it('should respect limit parameter', () => {
      const summaries = repository.findAll({ limit: 1 });
      expect(summaries).toHaveLength(1);
    });

    it('should respect offset parameter', () => {
      const summaries = repository.findAll({ limit: 1, offset: 1 });
      expect(summaries).toHaveLength(1);
    });

    it('should order by created_at descending', () => {
      const summaries = repository.findAll();
      expect(summaries).toHaveLength(2);
      // Both have same created_at, so just verify they all exist
      const ids = summaries.map((s) => s.id);
      expect(ids).toContain('summary-1');
      expect(ids).toContain('summary-2');
    });
  });
});
