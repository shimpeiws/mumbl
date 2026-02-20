/**
 * Trend detection and analysis types
 */

export interface Topic {
  id: string;
  name: string;
  firstSeen: Date;
  lastSeen: Date;
  totalCount: number;
  metadata: Record<string, unknown>;
}

export interface EntryTopic {
  entryId: string;
  topicId: string;
  relevance: number;
  createdAt: Date;
}

export type PeriodType = 'weekly' | 'monthly';

export interface TrendSummary {
  id: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  content: string;
  topicCounts: Record<string, number>;
  createdAt: Date;
}

export interface TrendAnalysis {
  topTopics: Array<{ topic: Topic; count: number }>;
  newTopics: Topic[];
  risingTopics: Array<{
    topic: Topic;
    trend: 'rising' | 'stable' | 'declining';
  }>;
}

export interface TrendServiceInterface {
  analyzeEntry(entryId: string, content: string): Promise<void>;
  getTrends(periodType: PeriodType, periodStart: Date, periodEnd: Date): TrendAnalysis;
  generateSummary(periodType: PeriodType): Promise<TrendSummary>;
  getTopTopics(limit?: number): Array<{ topic: Topic; count: number }>;
}
