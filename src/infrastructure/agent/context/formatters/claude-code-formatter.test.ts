import { describe, expect, it } from 'vitest';
import { AgentType } from '../../types.js';
import { PermissionLevel, type ContextEntry, type JournalContext } from '../context-protocol.js';
import { ClaudeCodeFormatter } from './claude-code-formatter.js';

describe('ClaudeCodeFormatter', () => {
  const formatter = new ClaudeCodeFormatter();

  const createEntry = (
    content: string,
    timestamp = new Date('2025-01-15T10:00:00Z'),
    options: Partial<ContextEntry> = {}
  ): ContextEntry => ({
    id: 'entry-1',
    timestamp,
    content,
    isTruncated: false,
    permissionLevel: PermissionLevel.Public,
    ...options,
  });

  const createContext = (entries: ContextEntry[] = []): JournalContext => ({
    requestId: 'req-123',
    contextType: 'recent',
    entries,
    metadata: {
      totalEntriesMatched: entries.length,
      entriesIncluded: entries.length,
      entriesExcludedByPermission: 0,
      wasContextTruncated: false,
      estimatedTokenCount: 100,
      generatedAt: new Date('2025-01-15T12:00:00Z'),
    },
  });

  describe('properties', () => {
    it('should have correct agent type', () => {
      expect(formatter.agentType).toBe(AgentType.ClaudeCode);
    });

    it('should have markdown format name', () => {
      expect(formatter.formatName).toBe('markdown');
    });

    it('should return markdown MIME type', () => {
      expect(formatter.getMimeType()).toBe('text/markdown');
    });
  });

  describe('format', () => {
    it('should format empty context', () => {
      const context = createContext();
      const result = formatter.format(context);

      expect(result).toContain('# Journal Context');
      expect(result).toContain('No journal entries available');
    });

    it('should format context with entries', () => {
      const entries = [createEntry('First entry'), createEntry('Second entry')];
      const context = createContext(entries);
      const result = formatter.format(context);

      expect(result).toContain('# Journal Context');
      expect(result).toContain('## Entries');
      expect(result).toContain('First entry');
      expect(result).toContain('Second entry');
    });

    it('should include context type', () => {
      const context = createContext();
      context.contextType = 'relevant';
      const result = formatter.format(context);

      expect(result).toContain('**Type:** Relevant Entries');
    });

    it('should include time range when present', () => {
      const context = createContext();
      context.timeRange = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-15T23:59:59Z'),
      };
      const result = formatter.format(context);

      expect(result).toContain('**Time Range:**');
    });

    it('should include metadata section by default', () => {
      const context = createContext();
      const result = formatter.format(context);

      expect(result).toContain('<details>');
      expect(result).toContain('Context Metadata');
      expect(result).toContain('Request ID');
    });

    it('should exclude metadata when disabled', () => {
      const context = createContext();
      const result = formatter.format(context, { includeMetadata: false });

      expect(result).not.toContain('<details>');
      expect(result).not.toContain('Context Metadata');
    });

    it('should include relevance query in metadata when present', () => {
      const context = createContext();
      context.metadata.relevanceQuery = 'test search';
      const result = formatter.format(context);

      expect(result).toContain('Query');
      expect(result).toContain('test search');
    });
  });

  describe('formatEntry', () => {
    it('should format entry with timestamp', () => {
      const entry = createEntry('Entry content', new Date('2025-01-15T10:00:00Z'));
      const result = formatter.formatEntry(entry);

      expect(result).toContain('###');
      expect(result).toContain('Entry content');
    });

    it('should exclude timestamp when disabled', () => {
      const entry = createEntry('Entry content');
      const result = formatter.formatEntry(entry, { includeTimestamps: false });

      expect(result).not.toContain('###');
      expect(result).toContain('Entry content');
    });

    it('should include relevance score when enabled', () => {
      const entry = createEntry('Content', undefined, { relevanceScore: 0.85 });
      const result = formatter.formatEntry(entry, { includeScores: true });

      expect(result).toContain('Relevance: 85%');
    });

    it('should not include relevance score by default', () => {
      const entry = createEntry('Content', undefined, { relevanceScore: 0.85 });
      const result = formatter.formatEntry(entry);

      expect(result).not.toContain('Relevance');
    });

    it('should indicate truncation when content was truncated', () => {
      const entry = createEntry('Content', undefined, { isTruncated: true });
      const result = formatter.formatEntry(entry);

      expect(result).toContain('[Content truncated]');
    });

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(500);
      const entry = createEntry(longContent);
      const result = formatter.formatEntry(entry, { maxContentLength: 100 });

      expect(result).toContain('...');
      expect(result).toContain('[Content truncated]');
    });
  });

  describe('context type labels', () => {
    it('should format recent context type', () => {
      const context = createContext();
      context.contextType = 'recent';
      const result = formatter.format(context);
      expect(result).toContain('Recent Entries');
    });

    it('should format relevant context type', () => {
      const context = createContext();
      context.contextType = 'relevant';
      const result = formatter.format(context);
      expect(result).toContain('Relevant Entries');
    });

    it('should format summary context type', () => {
      const context = createContext();
      context.contextType = 'summary';
      const result = formatter.format(context);
      expect(result).toContain('Summary');
    });

    it('should format specific context type', () => {
      const context = createContext();
      context.contextType = 'specific';
      const result = formatter.format(context);
      expect(result).toContain('Specific Entries');
    });
  });

  describe('escaping', () => {
    it('should handle pipe characters in metadata', () => {
      const context = createContext();
      context.metadata.relevanceQuery = 'query | with | pipes';
      const result = formatter.format(context);

      // Should not break the table
      expect(result).toContain('Query');
    });
  });
});
