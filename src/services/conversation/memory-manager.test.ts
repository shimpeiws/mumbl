import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../../infrastructure/database/schema.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import {
  type MemoryManagerInterface,
  SUMMARIZATION_THRESHOLD,
  createMemoryManager,
  estimateTokens,
} from './memory-manager.js';

function createMockLLMService(): LLMServiceInterface {
  return {
    chat: vi.fn().mockResolvedValue({ content: 'response', model: 'test' }),
    chatWithContext: vi.fn().mockResolvedValue({ content: 'contextual', model: 'test' }),
    stream: vi.fn(),
    summarize: vi.fn().mockResolvedValue({ content: 'summary of entries', model: 'test' }),
    reflect: vi.fn().mockResolvedValue({ content: 'reflection', model: 'test' }),
    react: vi.fn().mockResolvedValue({ content: 'reaction', model: 'test' }),
    healthCheck: vi.fn().mockResolvedValue({ primary: true }),
    clearHistory: vi.fn(),
    getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
  };
}

describe('estimateTokens', () => {
  it('should estimate tokens for ASCII text', () => {
    // 20 ASCII chars -> ceil(20/4) = 5 tokens
    const tokens = estimateTokens('Hello world testing!');
    expect(tokens).toBe(5);
  });

  it('should estimate tokens for CJK text', () => {
    // 3 CJK chars -> ceil(3/2) = 2 tokens
    const tokens = estimateTokens('\u3053\u3093\u306b\u3061\u306f');
    expect(tokens).toBe(3);
  });

  it('should handle mixed ASCII and CJK text', () => {
    // "Hello" (5 ASCII) + " " (1 ASCII) + 3 hiragana chars
    // ASCII: ceil(6/4) = 2, CJK: ceil(3/2) = 2 -> total 4
    const tokens = estimateTokens('Hello \u3053\u3093\u306b');
    expect(tokens).toBe(4);
  });

  it('should return 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('MemoryManager', () => {
  let db: Database.Database;
  let mockLLM: LLMServiceInterface;
  let manager: MemoryManagerInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    mockLLM = createMockLLMService();
    manager = createMemoryManager(db, mockLLM);

    // Create a conversation for testing
    db.prepare(`
      INSERT INTO conversations (id, title, started_at, updated_at, status)
      VALUES ('conv-1', 'Test', 1704067200, 1704067200, 'active')
    `).run();
  });

  afterEach(() => {
    db.close();
  });

  describe('getMemories', () => {
    it('should return empty array for conversation with no memories', () => {
      const memories = manager.getMemories('conv-1');
      expect(memories).toHaveLength(0);
    });

    it('should return memories for a conversation', () => {
      manager.updateBuffer('conv-1', 'test entry');

      const memories = manager.getMemories('conv-1');
      expect(memories).toHaveLength(1);
      expect(memories[0]?.memoryType).toBe('buffer');
    });
  });

  describe('updateBuffer', () => {
    it('should create a new buffer when none exists', () => {
      manager.updateBuffer('conv-1', 'first entry');

      const memories = manager.getMemories('conv-1');
      expect(memories).toHaveLength(1);
      expect(memories[0]?.memoryType).toBe('buffer');

      const content = memories[0]?.content as { entries: string[] };
      expect(content.entries).toEqual(['first entry']);
    });

    it('should append to existing buffer', () => {
      manager.updateBuffer('conv-1', 'first entry');
      manager.updateBuffer('conv-1', 'second entry');

      const memories = manager.getMemories('conv-1');
      expect(memories).toHaveLength(1);

      const content = memories[0]?.content as { entries: string[] };
      expect(content.entries).toEqual(['first entry', 'second entry']);
    });

    it('should update token count', () => {
      manager.updateBuffer('conv-1', 'test');

      const memories = manager.getMemories('conv-1');
      expect(memories[0]?.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('shouldSummarize', () => {
    it('should return false for empty conversation', () => {
      expect(manager.shouldSummarize('conv-1')).toBe(false);
    });

    it('should return false when below threshold', () => {
      manager.updateBuffer('conv-1', 'short entry');
      expect(manager.shouldSummarize('conv-1')).toBe(false);
    });

    it('should return true when buffer exceeds threshold', () => {
      // Generate enough text to exceed the threshold
      const longText = 'a'.repeat(SUMMARIZATION_THRESHOLD * 4 + 100);
      manager.updateBuffer('conv-1', longText);

      expect(manager.shouldSummarize('conv-1')).toBe(true);
    });
  });

  describe('summarizeOldest', () => {
    it('should do nothing when no buffer exists', async () => {
      await manager.summarizeOldest('conv-1');

      const memories = manager.getMemories('conv-1');
      expect(memories).toHaveLength(0);
    });

    it('should summarize older half of buffer entries', async () => {
      manager.updateBuffer('conv-1', 'entry 1');
      manager.updateBuffer('conv-1', 'entry 2');
      manager.updateBuffer('conv-1', 'entry 3');
      manager.updateBuffer('conv-1', 'entry 4');

      await manager.summarizeOldest('conv-1');

      expect(mockLLM.summarize).toHaveBeenCalledWith(['entry 1', 'entry 2']);

      const memories = manager.getMemories('conv-1');
      const summaries = memories.filter((m) => m.memoryType === 'summary');
      const buffers = memories.filter((m) => m.memoryType === 'buffer');

      expect(summaries).toHaveLength(1);
      expect(buffers).toHaveLength(1);

      const summaryContent = summaries[0]?.content as { summary: string };
      expect(summaryContent.summary).toBe('summary of entries');

      const bufferContent = buffers[0]?.content as { entries: string[] };
      expect(bufferContent.entries).toEqual(['entry 3', 'entry 4']);
    });

    it('should delete buffer when all entries are summarized', async () => {
      manager.updateBuffer('conv-1', 'only entry');

      await manager.summarizeOldest('conv-1');

      const memories = manager.getMemories('conv-1');
      const buffers = memories.filter((m) => m.memoryType === 'buffer');
      const summaries = memories.filter((m) => m.memoryType === 'summary');

      expect(buffers).toHaveLength(0);
      expect(summaries).toHaveLength(1);
    });
  });
});
