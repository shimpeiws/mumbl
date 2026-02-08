import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JournalEntry } from '../../../repositories/types.js';
import { RelevanceFilter } from './relevance-filter.js';

describe('RelevanceFilter', () => {
  let filter: RelevanceFilter;

  beforeEach(() => {
    filter = new RelevanceFilter();
    // Set a fixed date for consistent recency scoring
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createEntry = (
    content: string,
    timestamp: Date = new Date('2025-01-15T10:00:00Z'),
  ): JournalEntry => ({
    id: `test-${Math.random().toString(36).substring(7)}`,
    timestamp,
    content,
    metadata: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  describe('filterByRelevance', () => {
    it('should return entries sorted by recency when no query is provided', async () => {
      const entries = [
        createEntry('old entry', new Date('2025-01-10T10:00:00Z')),
        createEntry('new entry', new Date('2025-01-19T10:00:00Z')),
        createEntry('middle entry', new Date('2025-01-15T10:00:00Z')),
      ];

      const result = await filter.filterByRelevance(entries);

      expect(result).toHaveLength(3);
      expect(result[0].entry.content).toBe('new entry');
      expect(result[2].entry.content).toBe('old entry');
    });

    it('should return entries matching query terms', async () => {
      const entries = [
        createEntry('I love TypeScript programming'),
        createEntry('Today I went shopping for groceries'),
        createEntry('Programming in JavaScript is fun'),
      ];

      // Use higher minScore to filter out entries that only have recency score
      const result = await filter.filterByRelevance(entries, 'programming', { minScore: 0.5 });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.entry.content.toLowerCase().includes('programming'))).toBe(true);
    });

    it('should score entries with multiple matching terms higher', async () => {
      const entries = [
        createEntry('TypeScript is great'),
        createEntry('TypeScript programming is great for large projects'),
      ];

      const result = await filter.filterByRelevance(entries, 'TypeScript programming');

      expect(result).toHaveLength(2);
      // Entry with both terms should score higher
      expect(result[0].entry.content).toContain('programming');
    });

    it('should respect minScore option', async () => {
      const entries = [
        createEntry('relevant TypeScript content'),
        createEntry('completely unrelated content about cooking'),
      ];

      const result = await filter.filterByRelevance(entries, 'TypeScript', { minScore: 0.3 });

      expect(result.length).toBeLessThanOrEqual(2);
      expect(result.every((r) => r.score >= 0.3)).toBe(true);
    });

    it('should respect limit option', async () => {
      const entries = [
        createEntry('entry one TypeScript'),
        createEntry('entry two TypeScript'),
        createEntry('entry three TypeScript'),
      ];

      const result = await filter.filterByRelevance(entries, 'TypeScript', { limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('should handle empty entries array', async () => {
      const result = await filter.filterByRelevance([], 'query');
      expect(result).toHaveLength(0);
    });

    it('should handle empty query string', async () => {
      const entries = [createEntry('content')];
      const result = await filter.filterByRelevance(entries, '');
      expect(result).toHaveLength(1);
    });
  });

  describe('generateContextSummary', () => {
    it('should generate summary for multiple entries', async () => {
      const entries = [
        createEntry('First entry about work', new Date('2025-01-15T10:00:00Z')),
        createEntry('Second entry about family', new Date('2025-01-15T14:00:00Z')),
        createEntry('Third entry about hobbies', new Date('2025-01-16T10:00:00Z')),
      ];

      const summary = await filter.generateContextSummary(entries);

      expect(summary).toContain('Summary of 3 journal entries');
      expect(summary).toContain('2025-01-15');
      expect(summary).toContain('2025-01-16');
      expect(summary).toContain('work');
      expect(summary).toContain('family');
      expect(summary).toContain('hobbies');
    });

    it('should return empty message for no entries', async () => {
      const summary = await filter.generateContextSummary([]);
      expect(summary).toBe('No journal entries available.');
    });

    it('should truncate long entry content in preview', async () => {
      const longContent = 'This is a very long entry '.repeat(10);
      const entries = [createEntry(longContent)];

      const summary = await filter.generateContextSummary(entries);

      expect(summary).toContain('...');
    });

    it('should include time range information', async () => {
      const entries = [
        createEntry('old', new Date('2025-01-01T10:00:00Z')),
        createEntry('new', new Date('2025-01-20T10:00:00Z')),
      ];

      const summary = await filter.generateContextSummary(entries);

      expect(summary).toContain('Time range: 2025-01-01 to 2025-01-20');
    });
  });

  describe('getRecentEntries', () => {
    it('should return entries sorted by timestamp descending', () => {
      const entries = [
        createEntry('old', new Date('2025-01-10T10:00:00Z')),
        createEntry('new', new Date('2025-01-20T10:00:00Z')),
        createEntry('middle', new Date('2025-01-15T10:00:00Z')),
      ];

      const result = filter.getRecentEntries(entries, 3);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('new');
      expect(result[1].content).toBe('middle');
      expect(result[2].content).toBe('old');
    });

    it('should respect limit parameter', () => {
      const entries = [
        createEntry('1', new Date('2025-01-10')),
        createEntry('2', new Date('2025-01-11')),
        createEntry('3', new Date('2025-01-12')),
      ];

      const result = filter.getRecentEntries(entries, 2);

      expect(result).toHaveLength(2);
    });

    it('should not modify original array', () => {
      const entries = [
        createEntry('old', new Date('2025-01-10')),
        createEntry('new', new Date('2025-01-20')),
      ];
      const originalFirst = entries[0];

      filter.getRecentEntries(entries, 2);

      expect(entries[0]).toBe(originalFirst);
    });
  });

  describe('recency scoring', () => {
    it('should score today entries higher than older entries', async () => {
      const entries = [
        createEntry('today', new Date('2025-01-20T10:00:00Z')),
        createEntry('week ago', new Date('2025-01-13T10:00:00Z')),
        createEntry('month ago', new Date('2024-12-20T10:00:00Z')),
      ];

      const result = await filter.filterByRelevance(entries);

      expect(result[0].entry.content).toBe('today');
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[1].score).toBeGreaterThan(result[2].score);
    });
  });
});
