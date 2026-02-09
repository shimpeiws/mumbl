/**
 * Context sharing protocol types for agent communication
 * Defines the structure for sharing journal context with AI agents
 */

/**
 * Permission levels for journal entries
 * Controls visibility when sharing context with agents
 */
export enum PermissionLevel {
  /** Entry can be freely shared with any agent */
  Public = 'public',
  /** Entry should only be shared within the same session */
  Private = 'private',
  /** Entry contains sensitive data and should be redacted or excluded */
  Sensitive = 'sensitive',
}

/**
 * Context request type defining how to select entries
 */
export type ContextType = 'recent' | 'relevant' | 'summary' | 'specific';

/**
 * A single entry within the shared context
 */
export interface ContextEntry {
  /** Unique identifier of the original journal entry */
  id: string;
  /** Timestamp of the original entry */
  timestamp: Date;
  /** Entry content (may be truncated or redacted) */
  content: string;
  /** Whether the content was truncated */
  isTruncated: boolean;
  /** Relevance score if relevance filtering was applied (0-1) */
  relevanceScore?: number;
  /** Permission level of the original entry */
  permissionLevel: PermissionLevel;
}

/**
 * Metadata about the context being shared
 */
export interface ContextMetadata {
  /** Total number of entries matching criteria (before filtering) */
  totalEntriesMatched: number;
  /** Number of entries included in context */
  entriesIncluded: number;
  /** Number of entries excluded due to permissions */
  entriesExcludedByPermission: number;
  /** Whether the context was truncated due to size limits */
  wasContextTruncated: boolean;
  /** Approximate token count of the context */
  estimatedTokenCount: number;
  /** Timestamp when context was generated */
  generatedAt: Date;
  /** Query used for relevance filtering (if applicable) */
  relevanceQuery?: string;
}

/**
 * Complete journal context package for agent consumption
 */
export interface JournalContext {
  /** Unique identifier for this context request */
  requestId: string;
  /** Type of context that was requested */
  contextType: ContextType;
  /** Filtered and formatted journal entries */
  entries: ContextEntry[];
  /** Time range of included entries (if applicable) */
  timeRange?: { start: Date; end: Date };
  /** Metadata about the context generation */
  metadata: ContextMetadata;
}

/**
 * Options for building journal context
 */
export interface BuildContextOptions {
  /** Type of context to build */
  contextType: ContextType;
  /** Maximum number of entries to include */
  maxEntries?: number;
  /** Maximum total token count */
  maxTokens?: number;
  /** Maximum permission level to include */
  maxPermissionLevel?: PermissionLevel;
  /** Query for relevance filtering */
  relevanceQuery?: string;
  /** Time range filter */
  timeRange?: { start: Date; end: Date };
  /** Specific entry IDs to include (for 'specific' type) */
  entryIds?: string[];
  /** Whether to include entry timestamps */
  includeTimestamps?: boolean;
}

/**
 * Default values for context building
 */
export const DEFAULT_CONTEXT_OPTIONS = {
  maxEntries: 10,
  maxTokens: 4000,
  maxPermissionLevel: PermissionLevel.Private,
  includeTimestamps: true,
} as const;
