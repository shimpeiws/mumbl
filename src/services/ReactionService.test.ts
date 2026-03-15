import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import {
  type ReactionServiceInterface,
  createReactionService,
  isDuplicate,
  isLikelyBrokenJapanese,
} from './ReactionService.js';

describe('isLikelyBrokenJapanese', () => {
  it('should detect broken all-hiragana strings longer than 6 chars', () => {
    expect(isLikelyBrokenJapanese('れいかないよ', 'ja')).toBe(true);
    expect(isLikelyBrokenJapanese('あいうえおかきく', 'ja')).toBe(true);
  });

  it('should allow short hiragana strings', () => {
    expect(isLikelyBrokenJapanese('きつそう', 'ja')).toBe(false);
    expect(isLikelyBrokenJapanese('うん', 'ja')).toBe(false);
    expect(isLikelyBrokenJapanese('それな', 'ja')).toBe(false);
  });

  it('should allow strings with kanji or katakana', () => {
    expect(isLikelyBrokenJapanese('半端ないって', 'ja')).toBe(false);
    expect(isLikelyBrokenJapanese('マジかよ', 'ja')).toBe(false);
  });

  it('should not flag non-Japanese language', () => {
    expect(isLikelyBrokenJapanese('abcdefgh', 'en')).toBe(false);
    expect(isLikelyBrokenJapanese('れいかないよ', 'en')).toBe(false);
  });

  it('should not flag when language is undefined', () => {
    expect(isLikelyBrokenJapanese('れいかないよ', undefined)).toBe(false);
  });

  it('should allow 4-char or shorter strings', () => {
    expect(isLikelyBrokenJapanese('あいう', 'ja')).toBe(false);
    expect(isLikelyBrokenJapanese('あいうえ', 'ja')).toBe(false);
  });
});

describe('isDuplicate', () => {
  it('should detect exact duplicates', () => {
    expect(isDuplicate('きつそう', ['きつそう', 'やば'])).toBe(true);
  });

  it('should detect duplicates with whitespace differences', () => {
    expect(isDuplicate(' きつそう ', ['きつそう', 'やば'])).toBe(true);
  });

  it('should return false for non-duplicates', () => {
    expect(isDuplicate('new reaction', ['きつそう', 'やば'])).toBe(false);
  });

  it('should return false for empty recent list', () => {
    expect(isDuplicate('anything', [])).toBe(false);
  });
});

describe('ReactionService', () => {
  let db: Database.Database;
  let service: ReactionServiceInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    service = createReactionService(db);

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
      const disabledService = createReactionService(db, { enabled: false });
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
      const disabledService = createReactionService(db, { enabled: false });
      const reaction = await disabledService.generateReaction('entry-1', 'test content');

      expect(reaction).toBeNull();
    });

    it('should use default reaction type from config', async () => {
      const heardService = createReactionService(db, { defaultReactionType: 'heard' });
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
      const disabledService = createReactionService(db, { enabled: false });
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
      expect(config.useLLM).toBe(true);
    });
  });

  describe('with LLM service', () => {
    it('should use LLM when configured and pass empty recentEntries when no other entries', async () => {
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: "that's rough" }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'work is killing me');

      expect(mockLLMService.react).toHaveBeenCalledWith('work is killing me', {
        language: 'en',
        recentEntries: [],
        recentReactions: undefined,
      });
      expect(reaction?.content).toBe("that's rough");
      expect(reaction?.reactionType).toBe('custom');
    });

    it('should pass recent entries excluding the current entry', async () => {
      // Insert additional entries
      const insertEntry = db.prepare(
        `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      insertEntry.run(
        'entry-2',
        Date.now() / 1000 - 100,
        'had a long day',
        '{}',
        Date.now() / 1000 - 100,
        Date.now() / 1000 - 100,
      );
      insertEntry.run(
        'entry-3',
        Date.now() / 1000 - 200,
        'feeling tired',
        '{}',
        Date.now() / 1000 - 200,
        Date.now() / 1000 - 200,
      );

      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'rough' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      await llmService.generateReaction('entry-1', 'work is killing me');

      const callArgs = mockLLMService.react.mock.calls[0];
      expect(callArgs[1].recentEntries).toEqual(['had a long day', 'feeling tired']);
      expect(callArgs[1].recentEntries).not.toContain('Test content');
    });

    it('should limit recent entries to 5', async () => {
      const insertEntry = db.prepare(
        `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (let i = 2; i <= 8; i++) {
        const ts = Date.now() / 1000 - i * 100;
        insertEntry.run(`entry-${i}`, ts, `entry content ${i}`, '{}', ts, ts);
      }

      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'bruh' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      await llmService.generateReaction('entry-1', 'work is killing me');

      const callArgs = mockLLMService.react.mock.calls[0];
      expect(callArgs[1].recentEntries.length).toBe(3);
    });

    it('should fallback to default on LLM failure', async () => {
      const mockLLMService = {
        react: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'test content');

      expect(reaction?.content).toBe('·');
      expect(reaction?.reactionType).toBe('read');
    });

    it('should fallback when LLM response exceeds max length', async () => {
      const longResponse =
        'This is a very long response that exceeds the maximum allowed reaction length and should trigger the fallback behavior';
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: longResponse }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'test content');

      expect(reaction?.content).toBe('·');
      expect(reaction?.reactionType).toBe('read');
    });

    it('should use vocabulary fallback when LLM response is too long', async () => {
      const longResponse =
        'This is way too long for a reaction because it exceeds the maximum character limit that we have set for valid reactions in this service';
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: longResponse }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );
      llmService.setVocabulary({
        words: ['vibe'],
        phrases: [],
        tags: [],
        source: 'test',
      });

      const reaction = await llmService.generateReaction('entry-1', 'test content');

      expect(reaction?.content).toBe('vibe');
      expect(reaction?.reactionType).toBe('read');
    });

    it('should reject broken Japanese and use fallback', async () => {
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'れいかないよ' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true, language: 'ja' },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'テスト');

      // Should fallback since 'れいかないよ' is broken Japanese
      expect(reaction?.content).toBe('·');
      expect(reaction?.reactionType).toBe('read');
    });

    it('should accept valid short Japanese reactions', async () => {
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'きつそう' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true, language: 'ja' },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      const reaction = await llmService.generateReaction('entry-1', 'テスト');

      expect(reaction?.content).toBe('きつそう');
      expect(reaction?.reactionType).toBe('custom');
    });

    it('should retry once and use fallback when LLM returns duplicate both times', async () => {
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'きつそう' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true, language: 'ja' },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      // Insert additional entry
      db.prepare(
        `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('entry-2', Date.now() / 1000, 'Content 2', '{}', Date.now() / 1000, Date.now() / 1000);

      // First call succeeds
      const r1 = await llmService.generateReaction('entry-1', 'test content');
      expect(r1?.content).toBe('きつそう');
      expect(mockLLMService.react).toHaveBeenCalledTimes(1);

      // Second call: LLM returns same value both attempts, falls back to default
      const r2 = await llmService.generateReaction('entry-2', 'more content');
      expect(r2?.content).toBe('·');
      // 2 retry attempts
      expect(mockLLMService.react).toHaveBeenCalledTimes(3);
    });

    it('should accept LLM response on retry when second attempt is unique', async () => {
      const mockLLMService = {
        react: vi
          .fn()
          .mockResolvedValueOnce({ content: 'きつそう' })
          // Second call (first for entry-2): returns duplicate
          .mockResolvedValueOnce({ content: 'きつそう' })
          // Third call (retry for entry-2): returns unique value
          .mockResolvedValueOnce({ content: 'わかる' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true, language: 'ja' },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      db.prepare(
        `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('entry-2', Date.now() / 1000, 'Content 2', '{}', Date.now() / 1000, Date.now() / 1000);

      await llmService.generateReaction('entry-1', 'test content');
      const r2 = await llmService.generateReaction('entry-2', 'more content');
      expect(r2?.content).toBe('わかる');
      expect(mockLLMService.react).toHaveBeenCalledTimes(3);
    });

    it('should pass recent reactions to LLM after generating reactions', async () => {
      const mockLLMService = {
        react: vi.fn().mockResolvedValue({ content: 'やば' }),
      };

      const llmService = createReactionService(
        db,
        { useLLM: true },
        mockLLMService as unknown as Parameters<typeof createReactionService>[2],
      );

      // Insert additional test entries
      db.prepare(
        `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('entry-2', Date.now() / 1000, 'Content 2', '{}', Date.now() / 1000, Date.now() / 1000);

      // First reaction has no recent reaction history
      await llmService.generateReaction('entry-1', 'test content');
      expect(mockLLMService.react).toHaveBeenLastCalledWith(
        'test content',
        expect.objectContaining({ recentReactions: undefined }),
      );

      // Second reaction should include the first reaction in recent list
      await llmService.generateReaction('entry-2', 'more content');
      expect(mockLLMService.react).toHaveBeenLastCalledWith(
        'more content',
        expect.objectContaining({ recentReactions: ['やば'] }),
      );
    });
  });
});
