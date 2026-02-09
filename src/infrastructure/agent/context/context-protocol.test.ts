import { describe, expect, it } from 'vitest';
import {
  type BuildContextOptions,
  type ContextEntry,
  type ContextMetadata,
  DEFAULT_CONTEXT_OPTIONS,
  type JournalContext,
  PermissionLevel,
} from './context-protocol.js';

describe('context-protocol', () => {
  describe('PermissionLevel', () => {
    it('should have all expected permission levels', () => {
      expect(PermissionLevel.Public).toBe('public');
      expect(PermissionLevel.Private).toBe('private');
      expect(PermissionLevel.Sensitive).toBe('sensitive');
    });
  });

  describe('DEFAULT_CONTEXT_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_CONTEXT_OPTIONS.maxEntries).toBe(10);
      expect(DEFAULT_CONTEXT_OPTIONS.maxTokens).toBe(4000);
      expect(DEFAULT_CONTEXT_OPTIONS.maxPermissionLevel).toBe(PermissionLevel.Private);
      expect(DEFAULT_CONTEXT_OPTIONS.includeTimestamps).toBe(true);
    });
  });

  describe('Type structures', () => {
    it('should create valid ContextEntry', () => {
      const entry: ContextEntry = {
        id: 'entry-123',
        timestamp: new Date('2025-01-15T10:00:00Z'),
        content: 'Test journal entry content',
        isTruncated: false,
        permissionLevel: PermissionLevel.Public,
        relevanceScore: 0.85,
      };

      expect(entry.id).toBe('entry-123');
      expect(entry.content).toBe('Test journal entry content');
      expect(entry.isTruncated).toBe(false);
      expect(entry.permissionLevel).toBe(PermissionLevel.Public);
      expect(entry.relevanceScore).toBe(0.85);
    });

    it('should create valid ContextMetadata', () => {
      const metadata: ContextMetadata = {
        totalEntriesMatched: 50,
        entriesIncluded: 10,
        entriesExcludedByPermission: 5,
        wasContextTruncated: true,
        estimatedTokenCount: 3500,
        generatedAt: new Date('2025-01-15T10:00:00Z'),
        relevanceQuery: 'test query',
      };

      expect(metadata.totalEntriesMatched).toBe(50);
      expect(metadata.entriesIncluded).toBe(10);
      expect(metadata.entriesExcludedByPermission).toBe(5);
      expect(metadata.wasContextTruncated).toBe(true);
      expect(metadata.estimatedTokenCount).toBe(3500);
      expect(metadata.relevanceQuery).toBe('test query');
    });

    it('should create valid JournalContext', () => {
      const context: JournalContext = {
        requestId: 'req-abc123',
        contextType: 'recent',
        entries: [
          {
            id: 'entry-1',
            timestamp: new Date('2025-01-15T10:00:00Z'),
            content: 'Entry content',
            isTruncated: false,
            permissionLevel: PermissionLevel.Public,
          },
        ],
        timeRange: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-01-15T23:59:59Z'),
        },
        metadata: {
          totalEntriesMatched: 10,
          entriesIncluded: 1,
          entriesExcludedByPermission: 0,
          wasContextTruncated: false,
          estimatedTokenCount: 100,
          generatedAt: new Date('2025-01-15T12:00:00Z'),
        },
      };

      expect(context.requestId).toBe('req-abc123');
      expect(context.contextType).toBe('recent');
      expect(context.entries).toHaveLength(1);
      expect(context.timeRange).toBeDefined();
      expect(context.metadata.entriesIncluded).toBe(1);
    });

    it('should create valid BuildContextOptions', () => {
      const options: BuildContextOptions = {
        contextType: 'relevant',
        maxEntries: 20,
        maxTokens: 8000,
        maxPermissionLevel: PermissionLevel.Private,
        relevanceQuery: 'search query',
        timeRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
        entryIds: ['id-1', 'id-2'],
        includeTimestamps: true,
      };

      expect(options.contextType).toBe('relevant');
      expect(options.maxEntries).toBe(20);
      expect(options.maxTokens).toBe(8000);
      expect(options.maxPermissionLevel).toBe(PermissionLevel.Private);
      expect(options.relevanceQuery).toBe('search query');
      expect(options.entryIds).toHaveLength(2);
    });
  });
});
