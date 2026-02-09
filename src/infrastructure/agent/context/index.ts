/**
 * Agent context sharing module
 * Provides context sharing functionality with AI agents
 */

// Protocol and types
export {
  DEFAULT_CONTEXT_OPTIONS,
  PermissionLevel,
} from './context-protocol.js';
export type {
  BuildContextOptions,
  ContextEntry,
  ContextMetadata,
  ContextType,
  JournalContext,
} from './context-protocol.js';

// Permission management
export {
  containsSensitiveContent,
  countExcludedEntries,
  createPermissionManager,
  filterByPermission,
  getEntryPermission,
  redactSensitiveContent,
} from './permission-manager.js';
export type { PermissionManager } from './permission-manager.js';

// Relevance filtering
export {
  createRelevanceFilter,
  filterByRelevance,
  generateContextSummary,
  getRecentEntries,
} from './relevance-filter.js';
export type {
  RelevanceFilter,
  RelevanceFilterOptions,
  ScoredEntry,
} from './relevance-filter.js';

// Formatters
export {
  BaseContextFormatter,
  ClaudeCodeFormatter,
  DEFAULT_FORMAT_OPTIONS,
} from './formatters/index.js';
export type { FormatOptions } from './formatters/index.js';
