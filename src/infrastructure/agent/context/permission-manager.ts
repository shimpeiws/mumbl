/**
 * Permission manager for controlling access to journal entries
 * Handles filtering and redaction based on permission levels
 */

import type { JournalEntry } from '../../../repositories/types.js';
import { PermissionLevel } from './context-protocol.js';

/**
 * Patterns that indicate potentially sensitive content
 */
const SENSITIVE_PATTERNS = [
  // Personal identifiers
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
  // Secrets and credentials
  /\b(password|passwd|secret|api[_-]?key|token|auth)[\s:=]+\S+/i,
  // Private markers
  /\[(private|sensitive|confidential|secret)\]/i,
  // Email addresses (partial protection)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
];

/**
 * Redaction placeholder text
 */
const REDACTION_PLACEHOLDER = '[REDACTED]';

/**
 * Get the numeric order of permission levels (lower = more permissive)
 */
const getPermissionLevelOrder = (): Record<PermissionLevel, number> => ({
  [PermissionLevel.Public]: 0,
  [PermissionLevel.Private]: 1,
  [PermissionLevel.Sensitive]: 2,
});

/**
 * Parse a string into a PermissionLevel
 * @param level - String to parse
 * @returns PermissionLevel or undefined if invalid
 */
const parsePermissionLevel = (level: string): PermissionLevel | undefined => {
  const normalized = level.toLowerCase().trim();
  if (normalized === 'public') return PermissionLevel.Public;
  if (normalized === 'private') return PermissionLevel.Private;
  if (normalized === 'sensitive') return PermissionLevel.Sensitive;
  return undefined;
};

/**
 * Check if content contains sensitive patterns
 * @param content - Content to check
 * @returns True if sensitive patterns are found
 */
export const containsSensitiveContent = (content: string): boolean => {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(content));
};

/**
 * Determine the permission level of an entry based on its content and metadata
 * @param entry - The journal entry to evaluate
 * @returns The appropriate permission level
 */
export const getEntryPermission = (entry: JournalEntry): PermissionLevel => {
  // Check metadata for explicit permission setting
  const metadataPermission = entry.metadata['permissionLevel'] as string | undefined;
  if (metadataPermission) {
    const level = parsePermissionLevel(metadataPermission);
    if (level) {
      return level;
    }
  }

  // Check for sensitive content markers in metadata
  if (entry.metadata['sensitive'] === true || entry.metadata['private'] === true) {
    return PermissionLevel.Sensitive;
  }

  // Check content for sensitive patterns
  if (containsSensitiveContent(entry.content)) {
    return PermissionLevel.Sensitive;
  }

  // Default to private for non-explicitly public entries
  return PermissionLevel.Private;
};

/**
 * Filter entries by maximum permission level
 * @param entries - Entries to filter
 * @param maxLevel - Maximum permission level to include
 * @returns Filtered entries
 */
export const filterByPermission = (
  entries: JournalEntry[],
  maxLevel: PermissionLevel,
): JournalEntry[] => {
  const levelOrder = getPermissionLevelOrder();
  const maxLevelValue = levelOrder[maxLevel];

  return entries.filter((entry) => {
    const entryLevel = getEntryPermission(entry);
    return levelOrder[entryLevel] <= maxLevelValue;
  });
};

/**
 * Redact sensitive content from an entry
 * Returns a copy with sensitive patterns replaced
 * @param entry - Entry to redact
 * @returns Redacted copy of the entry
 */
export const redactSensitiveContent = (entry: JournalEntry): JournalEntry => {
  let content = entry.content;

  for (const pattern of SENSITIVE_PATTERNS) {
    content = content.replace(pattern, REDACTION_PLACEHOLDER);
  }

  return {
    ...entry,
    content,
    metadata: {
      ...entry.metadata,
      wasRedacted: content !== entry.content,
    },
  };
};

/**
 * Count entries that would be excluded at a given permission level
 * @param entries - Entries to evaluate
 * @param maxLevel - Maximum permission level to include
 * @returns Count of excluded entries
 */
export const countExcludedEntries = (
  entries: JournalEntry[],
  maxLevel: PermissionLevel,
): number => {
  const included = filterByPermission(entries, maxLevel);
  return entries.length - included.length;
};

/**
 * Permission manager interface for backward compatibility
 */
export interface PermissionManager {
  getEntryPermission: typeof getEntryPermission;
  filterByPermission: typeof filterByPermission;
  redactSensitiveContent: typeof redactSensitiveContent;
  containsSensitiveContent: typeof containsSensitiveContent;
  countExcludedEntries: typeof countExcludedEntries;
}

/**
 * Create a permission manager instance
 * @deprecated Use individual functions directly instead
 */
export const createPermissionManager = (): PermissionManager => ({
  getEntryPermission,
  filterByPermission,
  redactSensitiveContent,
  containsSensitiveContent,
  countExcludedEntries,
});
