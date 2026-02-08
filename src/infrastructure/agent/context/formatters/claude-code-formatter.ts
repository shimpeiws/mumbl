/**
 * Claude Code specific context formatter
 * Formats journal context in markdown optimized for Claude Code
 */

import { AgentType } from '../../types.js';
import type { ContextEntry, JournalContext } from '../context-protocol.js';
import { BaseContextFormatter, type FormatOptions } from './base-formatter.js';

/**
 * Formatter optimized for Claude Code CLI
 * Uses markdown format with structured sections
 */
export class ClaudeCodeFormatter extends BaseContextFormatter {
  readonly agentType = AgentType.ClaudeCode;
  readonly formatName = 'markdown';

  /**
   * Format complete journal context for Claude Code
   */
  format(context: JournalContext, options?: FormatOptions): string {
    const opts = this.mergeOptions(options);
    const sections: string[] = [];

    // Header section
    sections.push(this.formatHeader(context));

    // Entries section
    if (context.entries.length > 0) {
      sections.push(this.formatEntriesSection(context.entries, opts));
    } else {
      sections.push('*No journal entries available for the requested context.*');
    }

    // Metadata section (if enabled)
    if (opts.includeMetadata) {
      sections.push(this.formatMetadataSection(context));
    }

    return sections.join('\n\n');
  }

  /**
   * Format a single context entry
   */
  formatEntry(entry: ContextEntry, options?: FormatOptions): string {
    const opts = this.mergeOptions(options);
    const parts: string[] = [];

    // Entry header with timestamp
    if (opts.includeTimestamps) {
      parts.push(`### ${this.formatDateHuman(entry.timestamp)}`);
    }

    // Content
    const { content, truncated } = this.truncateContent(entry.content, opts.maxContentLength);
    parts.push(this.escapeContent(content));

    // Truncation notice
    if (truncated || entry.isTruncated) {
      parts.push('*[Content truncated]*');
    }

    // Relevance score (if enabled and available)
    if (opts.includeScores && entry.relevanceScore !== undefined) {
      parts.push(`*Relevance: ${(entry.relevanceScore * 100).toFixed(0)}%*`);
    }

    return parts.join('\n\n');
  }

  /**
   * Get MIME type for markdown
   */
  getMimeType(): string {
    return 'text/markdown';
  }

  /**
   * Format the header section
   */
  private formatHeader(context: JournalContext): string {
    const lines: string[] = [];

    lines.push('# Journal Context');
    lines.push('');
    lines.push(`**Type:** ${this.formatContextType(context.contextType)}`);

    if (context.timeRange) {
      const start = this.formatDateHuman(context.timeRange.start);
      const end = this.formatDateHuman(context.timeRange.end);
      lines.push(`**Time Range:** ${start} to ${end}`);
    }

    lines.push(`**Entries:** ${context.entries.length}`);

    return lines.join('\n');
  }

  /**
   * Format the entries section
   */
  private formatEntriesSection(entries: ContextEntry[], options: Required<FormatOptions>): string {
    const lines: string[] = [];

    lines.push('## Entries');
    lines.push('');

    for (const entry of entries) {
      lines.push(this.formatEntry(entry, options));
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Remove trailing separator
    lines.pop();
    lines.pop();

    return lines.join('\n');
  }

  /**
   * Format the metadata section
   */
  private formatMetadataSection(context: JournalContext): string {
    const { metadata } = context;
    const lines: string[] = [];

    lines.push('<details>');
    lines.push('<summary>Context Metadata</summary>');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Request ID | \`${context.requestId}\` |`);
    lines.push(`| Total Matched | ${metadata.totalEntriesMatched} |`);
    lines.push(`| Included | ${metadata.entriesIncluded} |`);
    lines.push(`| Excluded (permissions) | ${metadata.entriesExcludedByPermission} |`);
    lines.push(`| Context Truncated | ${metadata.wasContextTruncated ? 'Yes' : 'No'} |`);
    lines.push(`| Est. Tokens | ~${metadata.estimatedTokenCount} |`);
    lines.push(`| Generated | ${this.formatDateHuman(metadata.generatedAt)} |`);

    if (metadata.relevanceQuery) {
      lines.push(`| Query | "${this.escapeTableContent(metadata.relevanceQuery)}" |`);
    }

    lines.push('');
    lines.push('</details>');

    return lines.join('\n');
  }

  /**
   * Format context type for display
   */
  private formatContextType(type: string): string {
    const typeLabels: Record<string, string> = {
      recent: 'Recent Entries',
      relevant: 'Relevant Entries',
      summary: 'Summary',
      specific: 'Specific Entries',
    };
    return typeLabels[type] ?? type;
  }

  /**
   * Escape content for markdown tables
   */
  private escapeTableContent(content: string): string {
    return content.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  /**
   * Escape markdown special characters
   */
  protected override escapeContent(content: string): string {
    // Preserve code blocks and inline code
    // Only escape characters that might break formatting outside of code
    return content;
  }
}
