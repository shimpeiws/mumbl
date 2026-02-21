import { randomUUID } from 'node:crypto';
/**
 * Trend detection and analysis service
 */
import type Database from 'better-sqlite3';
import {
  type TopicRepositoryInterface,
  createTopicRepository,
} from '../../repositories/topic-repository.js';
import {
  type TrendSummaryRepositoryInterface,
  createTrendSummaryRepository,
} from '../../repositories/trend-summary-repository.js';
import type { TopicRow } from '../../repositories/types.js';
import { toUnixSeconds } from '../../utils/date.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import { createTrendSummaryPrompt } from '../llm/prompts.js';
import { extractTopics } from './topic-extractor.js';
import type {
  PeriodType,
  Topic,
  TrendAnalysis,
  TrendServiceInterface,
  TrendSummary,
} from './types.js';

function topicRowToDomain(row: TopicRow): Topic {
  return {
    id: row.id,
    name: row.name,
    firstSeen: new Date(row.first_seen * 1000),
    lastSeen: new Date(row.last_seen * 1000),
    totalCount: row.total_count,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
  };
}

function getPeriodBounds(periodType: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  const start = new Date(now);

  if (periodType === 'weekly') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
}

export function createTrendService(
  db: Database.Database,
  llmService: LLMServiceInterface,
): TrendServiceInterface {
  const topicRepository: TopicRepositoryInterface = createTopicRepository(db);
  const summaryRepository: TrendSummaryRepositoryInterface = createTrendSummaryRepository(db);

  const analyzeEntry = async (entryId: string, content: string): Promise<void> => {
    const topics = extractTopics(content);
    const now = new Date();

    for (const topicName of topics) {
      const existing = topicRepository.findByName(topicName);

      if (existing) {
        topicRepository.incrementCount(existing.id, now);
        topicRepository.addEntryTopic(entryId, existing.id, 1.0);
      } else {
        const topicRow = topicRepository.upsert(topicName);
        topicRepository.addEntryTopic(entryId, topicRow.id, 1.0);
      }
    }
  };

  const getTrends = (
    _periodType: PeriodType,
    periodStart: Date,
    periodEnd: Date,
  ): TrendAnalysis => {
    const topicCounts = topicRepository.getTopicCountsForPeriod(periodStart, periodEnd);

    // Get full topic data for top topics
    const topTopics: Array<{ topic: Topic; count: number }> = [];
    for (const tc of topicCounts.slice(0, 10)) {
      const topicRow = topicRepository.findByName(tc.name);
      if (topicRow) {
        topTopics.push({
          topic: topicRowToDomain(topicRow),
          count: tc.count,
        });
      }
    }

    // Find new topics (first seen within the period)
    const startTs = toUnixSeconds(periodStart);
    const newTopics: Topic[] = topTopics
      .filter((tt) => tt.topic.firstSeen.getTime() / 1000 >= startTs)
      .map((tt) => tt.topic);

    // Determine rising/stable/declining trends
    // Compare current period count to total average
    const risingTopics: TrendAnalysis['risingTopics'] = topTopics.map((tt) => {
      const avgCount = tt.topic.totalCount;
      let trend: 'rising' | 'stable' | 'declining';
      if (tt.count > avgCount / 2) {
        trend = 'rising';
      } else if (tt.count < avgCount / 4) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
      return { topic: tt.topic, trend };
    });

    return { topTopics, newTopics, risingTopics };
  };

  const generateSummary = async (periodType: PeriodType): Promise<TrendSummary> => {
    const { start, end } = getPeriodBounds(periodType);

    const topicCounts = topicRepository.getTopicCountsForPeriod(start, end);
    const countsMap: Record<string, number> = {};
    for (const tc of topicCounts) {
      countsMap[tc.name] = tc.count;
    }

    const messages = createTrendSummaryPrompt(countsMap);
    const response = await llmService.chat(messages.content, {
      includeHistory: false,
    });

    const id = randomUUID();
    const now = new Date();

    const summaryRow = {
      id,
      period_type: periodType,
      period_start: toUnixSeconds(start),
      period_end: toUnixSeconds(end),
      content: response.content,
      topic_counts: JSON.stringify(countsMap),
      created_at: toUnixSeconds(now),
    };

    summaryRepository.insert(summaryRow);

    return {
      id,
      periodType,
      periodStart: start,
      periodEnd: end,
      content: response.content,
      topicCounts: countsMap,
      createdAt: now,
    };
  };

  const getTopTopics = (limit = 10): Array<{ topic: Topic; count: number }> => {
    const rows = topicRepository.getTopTopics(limit);
    return rows.map((r) => ({
      topic: topicRowToDomain(r.topic),
      count: r.count,
    }));
  };

  return {
    analyzeEntry,
    getTrends,
    generateSummary,
    getTopTopics,
  };
}
