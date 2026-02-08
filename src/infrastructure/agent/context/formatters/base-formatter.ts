/**
 * Base formatter for context output
 * Abstract class that defines the formatting interface for different agents
 */

import type { AgentType } from '../../types.js';
import type { ContextEntry, JournalContext } from '../context-protocol.js';

/**
 * Options for formatting context
 */
export interface FormatOptions {
  /** Include entry timestamps */
  includeTimestamps?: boolean;
  /** Include relevance scores */
  includeScores?: boolean;
  /** Maximum content length per entry */
  maxContentLength?: number;
  /** Include metadata section */
  includeMetadata?: boolean;
}

/**
 * Default format options
 */
export const DEFAULT_FORMAT_OPTIONS: Required<FormatOptions> = {
  includeTimestamps: true,
  includeScores: false,
  maxContentLength: 1000,
  includeMetadata: true,
};

/**
 * Abstract base class for context formatters
 * Each agent type can have its own formatter implementation
 */
export abstract class BaseContextFormatter {
  /** The agent type this formatter is for */
  abstract readonly agentType: AgentType;

  /** The format name (e.g., 'markdown', 'json', 'xml') */
  abstract readonly formatName: string;

  /**
   * Format a complete journal context for the agent
   * @param context - The journal context to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  abstract format(context: JournalContext, options?: FormatOptions): string;

  /**
   * Format a single context entry
   * @param entry - The entry to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  abstract formatEntry(entry: ContextEntry, options?: FormatOptions): string;

  /**
   * Get the MIME type for this format
   */
  abstract getMimeType(): string;

  /**
   * Merge options with defaults
   */
  protected mergeOptions(options?: FormatOptions): Required<FormatOptions> {
    return { ...DEFAULT_FORMAT_OPTIONS, ...options };
  }

  /**
   * Truncate content to maximum length
   */
  protected truncateContent(content: string, maxLength: number): { content: string; truncated: boolean } {
    if (content.length <= maxLength) {
      return { content, truncated: false };
    }
    return {
      content: `${content.substring(0, maxLength - 3)}...`,
      truncated: true,
    };
  }

  /**
   * Format a date for display
   */
  protected formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format a date for human-readable display
   */
  protected formatDateHuman(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Escape special characters for the format
   * Override in subclasses as needed
   */
  protected escapeContent(content: string): string {
    return content;
  }
}
