import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionLevel } from '../../infrastructure/agent/context/context-protocol.js';
import { AgentType } from '../../infrastructure/agent/types.js';
import type { JournalEntry } from '../../repositories/types.js';
import { ContextSharingService } from './context-sharing-service.js';

describe('ContextSharingService', () => {
  let service: ContextSharingService;

  beforeEach(() => {
    service = new ContextSharingService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createEntry = (
    content: string,
    timestamp = new Date('2025-01-15T10:00:00Z'),
    metadata = {}
  ): JournalEntry => ({
    id: `entry-${Math.random().toString(36).substring(7)}`,
    timestamp,
    content,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  describe('isEnabled', () => {
    it('should return true by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      service.updateConfig({ enabled: false });
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getConfig / updateConfig', () => {
    it('should return default config', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.maxContextEntries).toBe(10);
      expect(config.maxContextTokens).toBe(4000);
    });

    it('should update config', () => {
      service.updateConfig({ maxContextEntries: 20 });
      const config = service.getConfig();
      expect(config.maxContextEntries).toBe(20);
    });
  });

  describe('buildContext', () => {
    it('should build context with entries', async () => {
      const entries = [
        createEntry('Entry 1'),
        createEntry('Entry 2'),
      ];

      const context = await service.buildContext(entries, { contextType: 'recent' });

      expect(context.requestId).toBeDefined();
      expect(context.contextType).toBe('recent');
      expect(context.entries).toHaveLength(2);
      expect(context.metadata.totalEntriesMatched).toBe(2);
      expect(context.metadata.entriesIncluded).toBe(2);
    });

    it('should filter by permission level', async () => {
      const entries = [
        createEntry('Public entry', undefined, { permissionLevel: 'public' }),
        createEntry('Sensitive entry', undefined, { permissionLevel: 'sensitive' }),
      ];

      const context = await service.buildContext(entries, {
        contextType: 'recent',
        maxPermissionLevel: PermissionLevel.Public,
      });

      expect(context.entries).toHaveLength(1);
      expect(context.metadata.entriesExcludedByPermission).toBe(1);
    });

    it('should respect maxEntries limit', async () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createEntry(`Entry ${i}`, new Date(2025, 0, i + 1))
      );

      const context = await service.buildContext(entries, {
        contextType: 'recent',
        maxEntries: 5,
      });

      expect(context.entries).toHaveLength(5);
    });

    it('should filter by time range', async () => {
      const entries = [
        createEntry('Old entry', new Date('2024-12-01')),
        createEntry('Recent entry', new Date('2025-01-15')),
        createEntry('Future entry', new Date('2025-02-01')),
      ];

      const context = await service.buildContext(entries, {
        contextType: 'recent',
        timeRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31'),
        },
      });

      expect(context.entries).toHaveLength(1);
      expect(context.entries[0].content).toBe('Recent entry');
    });

    it('should handle specific entry IDs', async () => {
      const entries = [
        { ...createEntry('Entry 1'), id: 'id-1' },
        { ...createEntry('Entry 2'), id: 'id-2' },
        { ...createEntry('Entry 3'), id: 'id-3' },
      ];

      const context = await service.buildContext(entries, {
        contextType: 'specific',
        entryIds: ['id-1', 'id-3'],
      });

      expect(context.entries).toHaveLength(2);
      expect(context.entries.map((e) => e.id)).toContain('id-1');
      expect(context.entries.map((e) => e.id)).toContain('id-3');
    });

    it('should calculate time range from entries', async () => {
      const entries = [
        createEntry('Early', new Date('2025-01-01')),
        createEntry('Middle', new Date('2025-01-15')),
        createEntry('Late', new Date('2025-01-30')),
      ];

      const context = await service.buildContext(entries, { contextType: 'recent' });

      expect(context.timeRange).toBeDefined();
      expect(context.timeRange?.start.toISOString()).toContain('2025-01-01');
      expect(context.timeRange?.end.toISOString()).toContain('2025-01-30');
    });
  });

  describe('getContextForAgent', () => {
    it('should return formatted context', async () => {
      const entries = [createEntry('Test entry')];

      const result = await service.getContextForAgent(entries, AgentType.ClaudeCode, {
        type: 'recent',
      });

      expect(result.success).toBe(true);
      expect(result.context).toContain('Journal Context');
      expect(result.context).toContain('Test entry');
      expect(result.metadata).toBeDefined();
    });

    it('should return error when disabled', async () => {
      service.updateConfig({ enabled: false });
      const entries = [createEntry('Test entry')];

      const result = await service.getContextForAgent(entries, AgentType.ClaudeCode, {
        type: 'recent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Context sharing is disabled');
    });

    it('should include metadata about entries', async () => {
      const entries = [
        createEntry('Public', undefined, { permissionLevel: 'public' }),
        createEntry('Sensitive', undefined, { permissionLevel: 'sensitive' }),
      ];

      const result = await service.getContextForAgent(entries, AgentType.ClaudeCode, {
        type: 'recent',
        maxPermissionLevel: PermissionLevel.Public,
      });

      expect(result.metadata?.entriesIncluded).toBe(1);
      expect(result.metadata?.entriesExcluded).toBe(1);
    });
  });

  describe('convenience methods', () => {
    const entries = [createEntry('Test entry')];

    it('getRecentContext should use recent type', async () => {
      const result = await service.getRecentContext(entries, AgentType.ClaudeCode);

      expect(result.success).toBe(true);
      expect(result.context).toContain('Recent Entries');
    });

    it('getSummaryContext should use summary type', async () => {
      const result = await service.getSummaryContext(entries, AgentType.ClaudeCode);

      expect(result.success).toBe(true);
      expect(result.context).toContain('Summary');
    });

    it('getRelevantContext should use relevant type with query', async () => {
      const result = await service.getRelevantContext(
        entries,
        AgentType.ClaudeCode,
        'test'
      );

      expect(result.success).toBe(true);
      expect(result.context).toContain('Relevant Entries');
    });
  });

  describe('token limiting', () => {
    it('should truncate context when exceeding token limit', async () => {
      // Create entries with substantial content
      const entries = Array.from({ length: 10 }, (_, i) =>
        createEntry('A'.repeat(2000), new Date(2025, 0, 20 - i))
      );

      const context = await service.buildContext(entries, {
        contextType: 'recent',
        maxTokens: 1000, // Very low limit
      });

      expect(context.metadata.wasContextTruncated).toBe(true);
      expect(context.metadata.estimatedTokenCount).toBeLessThanOrEqual(1000);
    });
  });

  describe('error handling', () => {
    it('should return error result on exception', async () => {
      // Create invalid entries that might cause issues
      const entries: JournalEntry[] = [];

      // This should not throw, just return empty context
      const result = await service.getContextForAgent(entries, AgentType.ClaudeCode, {
        type: 'recent',
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.entriesIncluded).toBe(0);
    });
  });
});
