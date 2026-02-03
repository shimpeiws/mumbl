import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import { ReactionService } from './reaction-service.js';

describe('ReactionService', () => {
  let db: Database.Database;
  let service: ReactionService;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    service = new ReactionService(db);

    // Insert test entries
    db.prepare(
      `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('entry-1', Date.now() / 1000, 'Test content', '{}', Date.now() / 1000, Date.now() / 1000);
  });

  afterEach(() => {
    db.close();
  });

  describe('isEnabled', () => {
    it('should return true by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledService = new ReactionService(db, { enabled: false });
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('generateReaction', () => {
    it('should generate a reaction for an entry', async () => {
      const reaction = await service.generateReaction('entry-1', 'test content');

      expect(reaction).not.toBeNull();
      expect(reaction?.entryId).toBe('entry-1');
      expect(reaction?.reactionType).toBe('read');
      expect(reaction?.content).toBe('·');
    });

    it('should return null when disabled', async () => {
      const disabledService = new ReactionService(db, { enabled: false });
      const reaction = await disabledService.generateReaction('entry-1', 'test content');

      expect(reaction).toBeNull();
    });

    it('should use default reaction type from config', async () => {
      const heardService = new ReactionService(db, { defaultReactionType: 'heard' });
      const reaction = await heardService.generateReaction('entry-1', 'test content');

      expect(reaction?.reactionType).toBe('heard');
      expect(reaction?.content).toBe('hearing you');
    });
  });

  describe('queueReaction', () => {
    it('should not throw when called', () => {
      expect(() => service.queueReaction('entry-1', 'test content')).not.toThrow();
    });

    it('should not queue when disabled', () => {
      const disabledService = new ReactionService(db, { enabled: false });
      disabledService.queueReaction('entry-1', 'test content');

      // Reaction should not be created
      const reaction = disabledService.getReaction('entry-1');
      expect(reaction).toBeNull();
    });

    it('should generate reaction asynchronously', async () => {
      service.queueReaction('entry-1', 'test content');

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      const reaction = service.getReaction('entry-1');
      expect(reaction).not.toBeNull();
    });
  });

  describe('getReaction', () => {
    it('should return null for entry without reaction', () => {
      const reaction = service.getReaction('entry-1');
      expect(reaction).toBeNull();
    });

    it('should return reaction after generation', async () => {
      await service.generateReaction('entry-1', 'test content');

      const reaction = service.getReaction('entry-1');
      expect(reaction).not.toBeNull();
      expect(reaction?.content).toBe('·');
    });
  });

  describe('getReactionsForEntries', () => {
    it('should return empty map for entries without reactions', () => {
      const reactions = service.getReactionsForEntries(['entry-1']);
      expect(reactions.size).toBe(0);
    });

    it('should return reactions map after generation', async () => {
      await service.generateReaction('entry-1', 'test content');

      const reactions = service.getReactionsForEntries(['entry-1']);
      expect(reactions.size).toBe(1);
      expect(reactions.get('entry-1')?.content).toBe('·');
    });
  });

  describe('deleteReaction', () => {
    it('should return false for entry without reaction', () => {
      const result = service.deleteReaction('entry-1');
      expect(result).toBe(false);
    });

    it('should delete reaction and return true', async () => {
      await service.generateReaction('entry-1', 'test content');

      const result = service.deleteReaction('entry-1');
      expect(result).toBe(true);
      expect(service.getReaction('entry-1')).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update enabled config', () => {
      expect(service.isEnabled()).toBe(true);

      service.updateConfig({ enabled: false });

      expect(service.isEnabled()).toBe(false);
    });

    it('should preserve other config when updating one field', () => {
      service.updateConfig({ enabled: false });
      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.defaultReactionType).toBe('read');
      expect(config.useLLM).toBe(false);
    });
  });

  describe('with LLM service', () => {
    it('should use LLM when configured', async () => {
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'that\'s rough' }),
      };

      const llmService = new ReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof ReactionService.prototype['generateReaction']>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'work is killing me');

      expect(mockLLMService.react).toHaveBeenCalledWith('work is killing me');
      expect(reaction?.content).toBe('that\'s rough');
      expect(reaction?.reactionType).toBe('custom');
    });

    it('should fallback to default on LLM failure', async () => {
      const mockLLMService = {
        react: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      };

      const llmService = new ReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof ReactionService.prototype['generateReaction']>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'test content');

      expect(reaction?.content).toBe('·');
      expect(reaction?.reactionType).toBe('read');
    });
  });
});
