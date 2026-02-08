/**
 * Types for context sharing service configuration and options
 */

import type { PermissionLevel } from '../../infrastructure/agent/context/context-protocol.js';

/**
 * Configuration for context sharing behavior
 */
export interface ContextSharingConfig {
  /** Whether context sharing is enabled */
  enabled: boolean;
  /** Default permission level for entries without explicit permission */
  defaultPermissionLevel: PermissionLevel;
  /** Maximum number of entries to include in context */
  maxContextEntries: number;
  /** Maximum token count for context */
  maxContextTokens: number;
  /** Whether to include entry timestamps in formatted output */
  includeTimestamps: boolean;
  /** Whether to include metadata in formatted output */
  includeMetadata: boolean;
}

/**
 * Options for requesting context
 */
export interface ContextRequestOptions {
  /** Type of context to retrieve */
  type: 'recent' | 'relevant' | 'summary' | 'specific';
  /** Query for relevance filtering (for 'relevant' type) */
  query?: string;
  /** Specific entry IDs to include (for 'specific' type) */
  entryIds?: string[];
  /** Maximum number of entries to include */
  maxEntries?: number;
  /** Maximum token count */
  maxTokens?: number;
  /** Maximum permission level to include */
  maxPermissionLevel?: PermissionLevel;
  /** Time range filter */
  timeRange?: { start: Date; end: Date };
}

/**
 * Result of a context request
 */
export interface ContextResult {
  /** Whether the request was successful */
  success: boolean;
  /** Formatted context string (if successful) */
  context?: string;
  /** Error message (if failed) */
  error?: string;
  /** Metadata about the context */
  metadata?: {
    entriesIncluded: number;
    entriesExcluded: number;
    estimatedTokens: number;
    wasTruncated: boolean;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONTEXT_SHARING_CONFIG: ContextSharingConfig = {
  enabled: true,
  defaultPermissionLevel: 'private' as PermissionLevel,
  maxContextEntries: 10,
  maxContextTokens: 4000,
  includeTimestamps: true,
  includeMetadata: true,
};
