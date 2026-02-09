/**
 * Context sharing service
 * Main service for sharing journal context with AI agents
 */

import { randomUUID } from 'node:crypto';
import {
  type BaseContextFormatter,
  ClaudeCodeFormatter,
} from '../../infrastructure/agent/context/formatters/index.js';
import {
  type BuildContextOptions,
  type ContextEntry,
  DEFAULT_CONTEXT_OPTIONS,
  type JournalContext,
  PermissionManager,
  RelevanceFilter,
  type ScoredEntry,
} from '../../infrastructure/agent/context/index.js';
import type { AgentType } from '../../infrastructure/agent/types.js';
import type { JournalEntry } from '../../repositories/types.js';
import type { ContextRequestOptions, ContextResult, ContextSharingConfig } from './types.js';
import { DEFAULT_CONTEXT_SHARING_CONFIG } from './types.js';

/**
 * Approximate tokens per character (conservative estimate)
 */
const TOKENS_PER_CHAR = 0.25;

/**
 * Service for sharing journal context with AI agents
 */
export class ContextSharingService {
  private config: ContextSharingConfig;
  private permissionManager: PermissionManager;
  private relevanceFilter: RelevanceFilter;
  private formatters: Map<AgentType, BaseContextFormatter>;

  constructor(config: Partial<ContextSharingConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_SHARING_CONFIG, ...config };
    this.permissionManager = new PermissionManager();
    this.relevanceFilter = new RelevanceFilter();
    this.formatters = new Map();

    // Register default formatters
    this.registerFormatter(new ClaudeCodeFormatter());
  }

  /**
   * Check if context sharing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextSharingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextSharingConfig {
    return { ...this.config };
  }

  /**
   * Register a custom formatter for an agent type
   */
  registerFormatter(formatter: BaseContextFormatter): void {
    this.formatters.set(formatter.agentType, formatter);
  }

  /**
   * Get a formatter for the specified agent type
   * Falls back to ClaudeCode formatter if not found
   */
  getFormatter(agentType: AgentType): BaseContextFormatter {
    return this.formatters.get(agentType) ?? new ClaudeCodeFormatter();
  }

  /**
   * Build journal context from entries
   */
  async buildContext(
    entries: JournalEntry[],
    options: BuildContextOptions,
  ): Promise<JournalContext> {
    const opts = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
    const maxPermission = opts.maxPermissionLevel ?? this.config.defaultPermissionLevel;

    // Filter by permission
    const permissionFiltered = this.permissionManager.filterByPermission(entries, maxPermission);
    const excludedByPermission = entries.length - permissionFiltered.length;

    // Filter by time range if specified
    let timeFiltered = permissionFiltered;
    if (opts.timeRange) {
      const { start, end } = opts.timeRange;
      timeFiltered = permissionFiltered.filter((entry) => {
        const time = entry.timestamp.getTime();
        return time >= start.getTime() && time <= end.getTime();
      });
    }

    // Apply relevance filtering or get recent entries
    let scoredEntries: ScoredEntry[];
    if (options.contextType === 'relevant' && opts.relevanceQuery) {
      scoredEntries = await this.relevanceFilter.filterByRelevance(
        timeFiltered,
        opts.relevanceQuery,
        { limit: opts.maxEntries },
      );
    } else {
      // For 'recent' and other types, score by recency
      scoredEntries = await this.relevanceFilter.filterByRelevance(timeFiltered, undefined, {
        limit: opts.maxEntries,
      });
    }

    // Handle 'specific' type - filter to specific IDs
    if (options.contextType === 'specific' && opts.entryIds) {
      const idSet = new Set(opts.entryIds);
      scoredEntries = scoredEntries.filter((se) => idSet.has(se.entry.id));
    }

    // Convert to context entries with token limiting
    const { contextEntries, wasTruncated, estimatedTokens } = this.convertToContextEntries(
      scoredEntries,
      opts.maxTokens ?? this.config.maxContextTokens,
    );

    // Determine time range from included entries
    const timeRange = this.calculateTimeRange(contextEntries);

    return {
      requestId: randomUUID(),
      contextType: options.contextType,
      entries: contextEntries,
      timeRange,
      metadata: {
        totalEntriesMatched: entries.length,
        entriesIncluded: contextEntries.length,
        entriesExcludedByPermission: excludedByPermission,
        wasContextTruncated: wasTruncated,
        estimatedTokenCount: estimatedTokens,
        generatedAt: new Date(),
        relevanceQuery: opts.relevanceQuery,
      },
    };
  }

  /**
   * Get formatted context for an agent
   */
  async getContextForAgent(
    entries: JournalEntry[],
    agentType: AgentType,
    options: ContextRequestOptions,
  ): Promise<ContextResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Context sharing is disabled',
      };
    }

    try {
      const buildOptions: BuildContextOptions = {
        contextType: options.type,
        maxEntries: options.maxEntries ?? this.config.maxContextEntries,
        maxTokens: options.maxTokens ?? this.config.maxContextTokens,
        maxPermissionLevel: options.maxPermissionLevel ?? this.config.defaultPermissionLevel,
        relevanceQuery: options.query,
        timeRange: options.timeRange,
        entryIds: options.entryIds,
        includeTimestamps: this.config.includeTimestamps,
      };

      const context = await this.buildContext(entries, buildOptions);
      const formatter = this.getFormatter(agentType);

      const formattedContext = formatter.format(context, {
        includeTimestamps: this.config.includeTimestamps,
        includeMetadata: this.config.includeMetadata,
      });

      return {
        success: true,
        context: formattedContext,
        metadata: {
          entriesIncluded: context.metadata.entriesIncluded,
          entriesExcluded: context.metadata.entriesExcludedByPermission,
          estimatedTokens: context.metadata.estimatedTokenCount,
          wasTruncated: context.metadata.wasContextTruncated,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate a summary context
   */
  async getSummaryContext(
    entries: JournalEntry[],
    agentType: AgentType,
    options: Partial<ContextRequestOptions> = {},
  ): Promise<ContextResult> {
    return this.getContextForAgent(entries, agentType, {
      type: 'summary',
      ...options,
    });
  }

  /**
   * Get recent entries context
   */
  async getRecentContext(
    entries: JournalEntry[],
    agentType: AgentType,
    options: Partial<ContextRequestOptions> = {},
  ): Promise<ContextResult> {
    return this.getContextForAgent(entries, agentType, {
      type: 'recent',
      ...options,
    });
  }

  /**
   * Get relevant entries context based on query
   */
  async getRelevantContext(
    entries: JournalEntry[],
    agentType: AgentType,
    query: string,
    options: Partial<ContextRequestOptions> = {},
  ): Promise<ContextResult> {
    return this.getContextForAgent(entries, agentType, {
      type: 'relevant',
      query,
      ...options,
    });
  }

  /**
   * Convert scored entries to context entries with token limiting
   */
  private convertToContextEntries(
    scoredEntries: ScoredEntry[],
    maxTokens: number,
  ): { contextEntries: ContextEntry[]; wasTruncated: boolean; estimatedTokens: number } {
    const contextEntries: ContextEntry[] = [];
    let totalTokens = 0;
    let wasTruncated = false;

    for (const { entry, score } of scoredEntries) {
      const entryTokens = this.estimateTokens(entry.content);

      if (totalTokens + entryTokens > maxTokens) {
        // Truncate this entry to fit
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 50) {
          // Only include if we have meaningful space
          const maxChars = Math.floor(remainingTokens / TOKENS_PER_CHAR);
          const truncatedContent = entry.content.substring(0, maxChars);
          contextEntries.push({
            id: entry.id,
            timestamp: entry.timestamp,
            content: truncatedContent,
            isTruncated: true,
            relevanceScore: score,
            permissionLevel: this.permissionManager.getEntryPermission(entry),
          });
          totalTokens += this.estimateTokens(truncatedContent);
        }
        wasTruncated = true;
        break;
      }

      contextEntries.push({
        id: entry.id,
        timestamp: entry.timestamp,
        content: entry.content,
        isTruncated: false,
        relevanceScore: score,
        permissionLevel: this.permissionManager.getEntryPermission(entry),
      });
      totalTokens += entryTokens;
    }

    return { contextEntries, wasTruncated, estimatedTokens: Math.ceil(totalTokens) };
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    return text.length * TOKENS_PER_CHAR;
  }

  /**
   * Calculate time range from context entries
   */
  private calculateTimeRange(entries: ContextEntry[]): { start: Date; end: Date } | undefined {
    if (entries.length === 0) {
      return undefined;
    }

    const timestamps = entries.map((e) => e.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
  }
}
