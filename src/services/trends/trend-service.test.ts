import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../../infrastructure/database/schema.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import { createTrendService } from './trend-service.js';
import type { TrendServiceInterface } from './types.js';

describe('TrendService', () => {
  let db: Database.Database;
  let trendService: TrendServiceInterface;
  let mockLLMService: LLMServiceInterface;

  const insertEntry = (id: string) => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO entries (id, timestamp, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, now, 'test content', now, now);
  };

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);

    mockLLMService = {
      chat: vi.fn().mockResolvedValue({ content: 'trend summary', model: 'test' }),
      chatWithContext: vi.fn().mockResolvedValue({ content: 'context', model: 'test' }),
      stream: vi.fn(),
      summarize: vi.fn().mockResolvedValue({ content: 'summary', model: 'test' }),
      reflect: vi.fn().mockResolvedValue({ content: 'reflection', model: 'test' }),
      react: vi.fn().mockResolvedValue({ content: 'reaction', model: 'test' }),
      healthCheck: vi.fn().mockResolvedValue({ primary: true }),
      clearHistory: vi.fn(),
      getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
    };

    trendService = createTrendService(db, mockLLMService);
  });

  afterEach(() => {
    db.close();
  });

  describe('analyzeEntry', () => {
    it('should extract topics from entry content and store them', async () => {
      insertEntry('entry-1');
      await trendService.analyzeEntry('entry-1', 'Work project deadline stress');

      const topTopics = trendService.getTopTopics(10);
      expect(topTopics.length).toBeGreaterThan(0);
      const topicNames = topTopics.map((t) => t.topic.name);
      expect(topicNames).toContain('work');
    });

    it('should increment topic count for repeated topics', async () => {
      insertEntry('entry-1');
      insertEntry('entry-2');
      await trendService.analyzeEntry('entry-1', 'Work project deadline');
      await trendService.analyzeEntry('entry-2', 'Work stress today');

      const topTopics = trendService.getTopTopics(10);
      const workTopic = topTopics.find((t) => t.topic.name === 'work');
      expect(workTopic).toBeDefined();
      expect(workTopic?.count).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty content gracefully', async () => {
      insertEntry('entry-1');
      await trendService.analyzeEntry('entry-1', '');
      const topTopics = trendService.getTopTopics(10);
      expect(topTopics).toHaveLength(0);
    });

    it('should create entry-topic associations', async () => {
      insertEntry('entry-1');
      await trendService.analyzeEntry('entry-1', 'coffee morning routine');

      // Verify via direct DB query
      const rows = db
        .prepare('SELECT * FROM entry_topics WHERE entry_id = ?')
        .all('entry-1') as Array<{ entry_id: string; topic_id: string }>;
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('getTrends', () => {
    beforeEach(async () => {
      insertEntry('entry-1');
      insertEntry('entry-2');
      insertEntry('entry-3');
      await trendService.analyzeEntry('entry-1', 'Work project deadline');
      await trendService.analyzeEntry('entry-2', 'Work stress management');
      await trendService.analyzeEntry('entry-3', 'Coffee morning routine');
    });

    it('should return top topics for a period', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const trends = trendService.getTrends('weekly', weekAgo, now);

      expect(trends.topTopics.length).toBeGreaterThan(0);
    });

    it('should identify new topics in the period', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const trends = trendService.getTrends('weekly', weekAgo, now);

      // All topics are new since we just created them
      expect(trends.newTopics.length).toBeGreaterThan(0);
    });

    it('should classify topic trends', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const trends = trendService.getTrends('weekly', weekAgo, now);

      for (const rt of trends.risingTopics) {
        expect(['rising', 'stable', 'declining']).toContain(rt.trend);
      }
    });
  });

  describe('generateSummary', () => {
    beforeEach(async () => {
      insertEntry('entry-1');
      insertEntry('entry-2');
      await trendService.analyzeEntry('entry-1', 'Work project deadline');
      await trendService.analyzeEntry('entry-2', 'Sleep deprivation stress');
    });

    it('should generate a trend summary via LLM', async () => {
      const summary = await trendService.generateSummary('weekly');

      expect(summary.content).toBe('trend summary');
      expect(summary.periodType).toBe('weekly');
      expect(summary.periodStart).toBeInstanceOf(Date);
      expect(summary.periodEnd).toBeInstanceOf(Date);
      expect(summary.id).toBeDefined();
      expect(mockLLMService.chat).toHaveBeenCalled();
    });

    it('should store the summary in the database', async () => {
      await trendService.generateSummary('weekly');

      const rows = db.prepare('SELECT * FROM trend_summaries').all() as Array<{ id: string }>;
      expect(rows).toHaveLength(1);
    });

    it('should include topic counts in the summary', async () => {
      const summary = await trendService.generateSummary('monthly');

      expect(summary.topicCounts).toBeDefined();
      expect(typeof summary.topicCounts).toBe('object');
    });
  });

  describe('getTopTopics', () => {
    it('should return empty array when no topics exist', () => {
      const topTopics = trendService.getTopTopics(5);
      expect(topTopics).toHaveLength(0);
    });

    it('should return topics ordered by count', async () => {
      insertEntry('entry-1');
      insertEntry('entry-2');
      insertEntry('entry-3');
      await trendService.analyzeEntry('entry-1', 'work stress');
      await trendService.analyzeEntry('entry-2', 'work deadline');
      await trendService.analyzeEntry('entry-3', 'coffee break');

      const topTopics = trendService.getTopTopics(10);
      expect(topTopics.length).toBeGreaterThan(0);

      // Verify ordered by count descending
      for (let i = 1; i < topTopics.length; i++) {
        const prev = topTopics[i - 1];
        const curr = topTopics[i];
        if (prev && curr) {
          expect(prev.count).toBeGreaterThanOrEqual(curr.count);
        }
      }
    });

    it('should respect the limit parameter', async () => {
      insertEntry('entry-1');
      await trendService.analyzeEntry('entry-1', 'alpha bravo charlie delta echo foxtrot');

      const topTopics = trendService.getTopTopics(2);
      expect(topTopics.length).toBeLessThanOrEqual(2);
    });
  });
});
