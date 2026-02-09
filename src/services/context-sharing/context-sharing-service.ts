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
  type ScoredEntry,
  filterByPermission,
  filterByRelevance,
  getEntryPermission,
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
 * Context sharing service interface
 */
export interface ContextSharingService {
  isEnabled(): boolean;
  updateConfig(config: Partial<ContextSharingConfig>): void;
  getConfig(): ContextSharingConfig;
  registerFormatter(formatter: BaseContextFormatter): void;
  getFormatter(agentType: AgentType): BaseContextFormatter;
  buildContext(entries: JournalEntry[], options: BuildContextOptions): Promise<JournalContext>;
  getContextForAgent(
    entries: JournalEntry[],
    agentType: AgentType,
    options: ContextRequestOptions,
  ): Promise<ContextResult>;
  getSummaryContext(
    entries: JournalEntry[],
    agentType: AgentType,
    options?: Partial<ContextRequestOptions>,
  ): Promise<ContextResult>;
  getRecentContext(
    entries: JournalEntry[],
    agentType: AgentType,
    options?: Partial<ContextRequestOptions>,
  ): Promise<ContextResult>;
  getRelevantContext(
    entries: JournalEntry[],
    agentType: AgentType,
    query: string,
    options?: Partial<ContextRequestOptions>,
  ): Promise<ContextResult>;
}

/**
 * Create a new ContextSharingService instance
 */
export function createContextSharingService(
  initialConfig: Partial<ContextSharingConfig> = {},
): ContextSharingService {
  let config: ContextSharingConfig = { ...DEFAULT_CONTEXT_SHARING_CONFIG, ...initialConfig };
  const formatters = new Map<AgentType, BaseContextFormatter>();

  // Register default formatters
  const defaultFormatter = new ClaudeCodeFormatter();
  formatters.set(defaultFormatter.agentType, defaultFormatter);

  /**
   * Estimate token count for text
   */
  const estimateTokens = (text: string): number => {
    return text.length * TOKENS_PER_CHAR;
  };

  /**
   * Calculate time range from context entries
   */
  const calculateTimeRange = (entries: ContextEntry[]): { start: Date; end: Date } | undefined => {
    if (entries.length === 0) {
      return undefined;
    }

    const timestamps = entries.map((e) => e.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
  };

  /**
   * Convert scored entries to context entries with token limiting
   */
  const convertToContextEntries = (
    scoredEntries: ScoredEntry[],
    maxTokens: number,
  ): { contextEntries: ContextEntry[]; wasTruncated: boolean; estimatedTokens: number } => {
    const contextEntries: ContextEntry[] = [];
    let totalTokens = 0;
    let wasTruncated = false;

    for (const { entry, score } of scoredEntries) {
      const entryTokens = estimateTokens(entry.content);

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
            permissionLevel: getEntryPermission(entry),
          });
          totalTokens += estimateTokens(truncatedContent);
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
        permissionLevel: getEntryPermission(entry),
      });
      totalTokens += entryTokens;
    }

    return { contextEntries, wasTruncated, estimatedTokens: Math.ceil(totalTokens) };
  };

  const isEnabled = (): boolean => config.enabled;

  const updateConfig = (newConfig: Partial<ContextSharingConfig>): void => {
    config = { ...config, ...newConfig };
  };

  const getConfig = (): ContextSharingConfig => ({ ...config });

  const registerFormatter = (formatter: BaseContextFormatter): void => {
    formatters.set(formatter.agentType, formatter);
  };

  const getFormatter = (agentType: AgentType): BaseContextFormatter => {
    return formatters.get(agentType) ?? new ClaudeCodeFormatter();
  };

  const buildContext = async (
    entries: JournalEntry[],
    options: BuildContextOptions,
  ): Promise<JournalContext> => {
    const opts = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
    const maxPermission = opts.maxPermissionLevel ?? config.defaultPermissionLevel;

    // Filter by permission
    const permissionFiltered = filterByPermission(entries, maxPermission);
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
      scoredEntries = await filterByRelevance(timeFiltered, opts.relevanceQuery, {
        limit: opts.maxEntries,
      });
    } else {
      // For 'recent' and other types, score by recency
      scoredEntries = await filterByRelevance(timeFiltered, undefined, {
        limit: opts.maxEntries,
      });
    }

    // Handle 'specific' type - filter to specific IDs
    if (options.contextType === 'specific' && opts.entryIds) {
      const idSet = new Set(opts.entryIds);
      scoredEntries = scoredEntries.filter((se) => idSet.has(se.entry.id));
    }

    // Convert to context entries with token limiting
    const { contextEntries, wasTruncated, estimatedTokens } = convertToContextEntries(
      scoredEntries,
      opts.maxTokens ?? config.maxContextTokens,
    );

    // Determine time range from included entries
    const timeRange = calculateTimeRange(contextEntries);

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
  };

  const getContextForAgent = async (
    entries: JournalEntry[],
    agentType: AgentType,
    options: ContextRequestOptions,
  ): Promise<ContextResult> => {
    if (!config.enabled) {
      return {
        success: false,
        error: 'Context sharing is disabled',
      };
    }

    try {
      const buildOptions: BuildContextOptions = {
        contextType: options.type,
        maxEntries: options.maxEntries ?? config.maxContextEntries,
        maxTokens: options.maxTokens ?? config.maxContextTokens,
        maxPermissionLevel: options.maxPermissionLevel ?? config.defaultPermissionLevel,
        relevanceQuery: options.query,
        timeRange: options.timeRange,
        entryIds: options.entryIds,
        includeTimestamps: config.includeTimestamps,
      };

      const context = await buildContext(entries, buildOptions);
      const formatter = getFormatter(agentType);

      const formattedContext = formatter.format(context, {
        includeTimestamps: config.includeTimestamps,
        includeMetadata: config.includeMetadata,
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
  };

  const getSummaryContext = async (
    entries: JournalEntry[],
    agentType: AgentType,
    options: Partial<ContextRequestOptions> = {},
  ): Promise<ContextResult> => {
    return getContextForAgent(entries, agentType, {
      type: 'summary',
      ...options,
    });
  };

  const getRecentContext = async (
    entries: JournalEntry[],
    agentType: AgentType,
    options: Partial<ContextRequestOptions> = {},
  ): Promise<ContextResult> => {
    return getContextForAgent(entries, agentType, {
      type: 'recent',
      ...options,
    });
  };

  const getRelevantContext = async (
    entries: JournalEntry[],
    agentType: AgentType,
    query: string,
    options: Partial<ContextRequestOptions> = {},
  ): Promise<ContextResult> => {
    return getContextForAgent(entries, agentType, {
      type: 'relevant',
      query,
      ...options,
    });
  };

  return {
    isEnabled,
    updateConfig,
    getConfig,
    registerFormatter,
    getFormatter,
    buildContext,
    getContextForAgent,
    getSummaryContext,
    getRecentContext,
    getRelevantContext,
  };
}
