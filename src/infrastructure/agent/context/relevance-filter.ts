/**
 * Relevance filtering for journal entries
 * Provides scoring and filtering based on content relevance to queries
 */

import type { JournalEntry } from '../../../repositories/types.js';

/**
 * Entry with an associated relevance score
 */
export interface ScoredEntry {
  /** The original journal entry */
  entry: JournalEntry;
  /** Relevance score between 0 and 1 */
  score: number;
}

/**
 * Options for relevance filtering
 */
export interface RelevanceFilterOptions {
  /** Minimum score threshold for inclusion (0-1) */
  minScore?: number;
  /** Maximum number of entries to return */
  limit?: number;
  /** Weight for recency in scoring (0-1) */
  recencyWeight?: number;
}

/**
 * Default options for relevance filtering
 */
const DEFAULT_OPTIONS: Required<RelevanceFilterOptions> = {
  minScore: 0.1,
  limit: 10,
  recencyWeight: 0.3,
};

/**
 * Relevance filter for journal entries
 * Uses text similarity and recency to score entries
 */
export class RelevanceFilter {
  /**
   * Filter entries by relevance to a query
   * @param entries - Entries to filter
   * @param query - Query string to match against
   * @param options - Filtering options
   * @returns Scored entries sorted by relevance
   */
  async filterByRelevance(
    entries: JournalEntry[],
    query?: string,
    options: RelevanceFilterOptions = {}
  ): Promise<ScoredEntry[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!query || query.trim() === '') {
      // Without a query, return entries sorted by recency
      return this.scoreByRecency(entries, opts.limit);
    }

    const scored = entries.map((entry) => ({
      entry,
      score: this.calculateRelevanceScore(entry, query, opts.recencyWeight),
    }));

    return scored
      .filter((s) => s.score >= opts.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit);
  }

  /**
   * Generate a summary of multiple entries
   * Creates a condensed representation suitable for context
   * @param entries - Entries to summarize
   * @returns Summary string
   */
  async generateContextSummary(entries: JournalEntry[]): Promise<string> {
    if (entries.length === 0) {
      return 'No journal entries available.';
    }

    // Group entries by date
    const byDate = this.groupEntriesByDate(entries);

    const summaryParts: string[] = [];
    summaryParts.push(`Summary of ${entries.length} journal entries:`);
    summaryParts.push('');

    for (const [date, dateEntries] of Object.entries(byDate)) {
      summaryParts.push(`## ${date}`);

      for (const entry of dateEntries) {
        const preview = this.generateEntryPreview(entry);
        summaryParts.push(`- ${preview}`);
      }

      summaryParts.push('');
    }

    // Add time range info
    const timestamps = entries.map((e) => e.timestamp.getTime());
    const oldest = new Date(Math.min(...timestamps));
    const newest = new Date(Math.max(...timestamps));
    summaryParts.push(`Time range: ${this.formatDate(oldest)} to ${this.formatDate(newest)}`);

    return summaryParts.join('\n');
  }

  /**
   * Get the most recent entries
   * @param entries - All entries
   * @param limit - Maximum number to return
   * @returns Most recent entries
   */
  getRecentEntries(entries: JournalEntry[], limit: number): JournalEntry[] {
    return [...entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Calculate relevance score for an entry
   * Combines text similarity with recency
   */
  private calculateRelevanceScore(
    entry: JournalEntry,
    query: string,
    recencyWeight: number
  ): number {
    const textScore = this.calculateTextSimilarity(entry.content, query);
    const recencyScore = this.calculateRecencyScore(entry.timestamp);

    return textScore * (1 - recencyWeight) + recencyScore * recencyWeight;
  }

  /**
   * Calculate text similarity score between content and query
   * Uses TF-IDF-like term frequency matching
   */
  private calculateTextSimilarity(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Tokenize
    const queryTerms = this.tokenize(queryLower);
    const contentTerms = this.tokenize(contentLower);

    if (queryTerms.length === 0 || contentTerms.length === 0) {
      return 0;
    }

    // Calculate term frequency matches
    let matchCount = 0;
    let exactMatchBonus = 0;

    for (const term of queryTerms) {
      if (contentTerms.includes(term)) {
        matchCount++;
      }
      // Bonus for exact phrase match
      if (contentLower.includes(term)) {
        exactMatchBonus += 0.1;
      }
    }

    const baseScore = matchCount / queryTerms.length;
    return Math.min(1, baseScore + exactMatchBonus);
  }

  /**
   * Calculate recency score (newer = higher score)
   */
  private calculateRecencyScore(timestamp: Date): number {
    const now = Date.now();
    const age = now - timestamp.getTime();

    // Score decay: 1.0 for today, ~0.5 for a week ago, ~0.1 for a month ago
    const dayInMs = 24 * 60 * 60 * 1000;
    const daysOld = age / dayInMs;

    // Exponential decay with half-life of 7 days
    return Math.exp(-daysOld * Math.LN2 / 7);
  }

  /**
   * Score entries by recency only
   */
  private scoreByRecency(entries: JournalEntry[], limit: number): ScoredEntry[] {
    return entries
      .map((entry) => ({
        entry,
        score: this.calculateRecencyScore(entry.timestamp),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .split(/[\s\-_.,;:!?'"()\[\]{}]+/)
      .filter((term) => term.length >= 2);
  }

  /**
   * Generate a short preview of an entry
   */
  private generateEntryPreview(entry: JournalEntry, maxLength = 100): string {
    const content = entry.content.replace(/\s+/g, ' ').trim();
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.substring(0, maxLength - 3)}...`;
  }

  /**
   * Group entries by date
   */
  private groupEntriesByDate(entries: JournalEntry[]): Record<string, JournalEntry[]> {
    const groups: Record<string, JournalEntry[]> = {};

    for (const entry of entries) {
      const date = this.formatDate(entry.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    }

    return groups;
  }

  /**
   * Format a date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const parts = date.toISOString().split('T');
    return parts[0] ?? date.toDateString();
  }
}
