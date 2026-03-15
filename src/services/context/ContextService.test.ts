import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../../infrastructure/database/schema.js';
import type { LLMServiceInterface } from '../llm/LLMService.js';
import { createContextService } from './ContextService.js';
import type { ContextServiceInterface } from './types.js';

describe('ContextService', () => {
  let db: Database.Database;
  let llmService: LLMServiceInterface;
  let service: ContextServiceInterface;

  const createMockLLMService = (): LLMServiceInterface => ({
    chat: vi.fn().mockResolvedValue({ content: '[]' }),
    chatWithContext: vi.fn(),
    stream: vi.fn(),
    summarize: vi.fn(),
    reflect: vi.fn(),
    react: vi.fn(),
    healthCheck: vi.fn(),
    clearHistory: vi.fn(),
    getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
    setContextService: vi.fn(),
  });

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    llmService = createMockLLMService();
    service = createContextService(db, llmService);
  });

  afterEach(() => {
    db.close();
  });

  describe('processEntry', () => {
    it('should extract and store context from entry', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'favorite_drink',
          value: { description: 'likes coffee' },
          confidence: 0.8,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'Had a great coffee today');

      const items = service.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.key).toBe('favorite_drink');
      expect(items[0]?.contextType).toBe('preference');
    });

    it('should handle multiple extracted items', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'drink',
          value: { description: 'coffee' },
          confidence: 0.7,
        },
        {
          contextType: 'pattern',
          key: 'morning_routine',
          value: { description: 'early riser' },
          confidence: 0.5,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'Woke up early, had coffee');

      const items = service.getItems();
      expect(items).toHaveLength(2);
    });

    it('should skip processing when disabled', async () => {
      const disabledService = createContextService(db, llmService, {
        enabled: false,
      });

      await disabledService.processEntry('entry-1', 'test content');

      expect(llmService.chat).not.toHaveBeenCalled();
      expect(disabledService.getItems()).toHaveLength(0);
    });

    it('should handle LLM errors gracefully', async () => {
      (llmService.chat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

      await service.processEntry('entry-1', 'test content');

      const items = service.getItems();
      expect(items).toHaveLength(0);
    });
  });

  describe('getContextSummary', () => {
    it('should return empty summary when no items exist', () => {
      const summary = service.getContextSummary();
      expect(summary.totalItems).toBe(0);
      expect(summary.items).toHaveLength(0);
    });

    it('should return all items including private ones', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'profile',
          key: 'name',
          value: { description: 'John' },
          confidence: 0.9,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'My name is John');

      const items = service.getItems();
      if (items[0]) {
        service.setPrivate(items[0].id, true);
      }

      const summary = service.getContextSummary();
      expect(summary.totalItems).toBe(1);
      expect(summary.items[0]?.isPrivate).toBe(true);
    });
  });

  describe('getContextForLLM', () => {
    it('should return empty string when no context exists', () => {
      const context = service.getContextForLLM();
      expect(context).toBe('');
    });

    it('should format context for LLM injection', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'drink',
          value: { description: 'likes coffee' },
          confidence: 0.8,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'coffee lover');

      const context = service.getContextForLLM();
      expect(context).toContain('## What I Know About You');
      expect(context).toContain('drink');
      expect(context).toContain('likes coffee');
      expect(context).toContain('high');
    });

    it('should exclude private items in strict mode', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'profile',
          key: 'email',
          value: { description: 'test@example.com' },
          confidence: 0.9,
        },
        {
          contextType: 'preference',
          key: 'drink',
          value: { description: 'coffee' },
          confidence: 0.8,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');

      const items = service.getItems();
      const emailItem = items.find((i) => i.key === 'email');
      if (emailItem) {
        service.setPrivate(emailItem.id, true);
      }

      const context = service.getContextForLLM('strict');
      expect(context).not.toContain('email');
      expect(context).toContain('drink');
    });

    it('should filter by minimum confidence', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'high_conf',
          value: { description: 'strong signal' },
          confidence: 0.9,
        },
        {
          contextType: 'preference',
          key: 'low_conf',
          value: { description: 'weak signal' },
          confidence: 0.1,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');

      // Default minConfidence is 0.3
      const context = service.getContextForLLM();
      expect(context).toContain('high_conf');
      expect(context).not.toContain('low_conf');
    });
  });

  describe('getItems', () => {
    beforeEach(async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'drink',
          value: { description: 'coffee' },
          confidence: 0.8,
        },
        {
          contextType: 'pattern',
          key: 'sleep',
          value: { description: 'late sleeper' },
          confidence: 0.6,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');
    });

    it('should return all items', () => {
      const items = service.getItems();
      expect(items).toHaveLength(2);
    });

    it('should filter by type', () => {
      const items = service.getItems({ type: 'preference' });
      expect(items).toHaveLength(1);
      expect(items[0]?.contextType).toBe('preference');
    });

    it('should filter by minimum confidence', () => {
      const items = service.getItems({ minConfidence: 0.7 });
      expect(items).toHaveLength(1);
      expect(items[0]?.key).toBe('drink');
    });
  });

  describe('setPrivate', () => {
    it('should mark item as private', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'profile',
          key: 'email',
          value: { description: 'test@example.com' },
          confidence: 0.9,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');

      const items = service.getItems();
      expect(items[0]?.isPrivate).toBe(false);

      if (items[0]) {
        service.setPrivate(items[0].id, true);
      }

      const updated = service.getItems();
      expect(updated[0]?.isPrivate).toBe(true);
    });
  });

  describe('deleteItem', () => {
    it('should delete a context item', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'drink',
          value: { description: 'coffee' },
          confidence: 0.8,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');

      const items = service.getItems();
      expect(items).toHaveLength(1);

      if (items[0]) {
        service.deleteItem(items[0].id);
      }

      expect(service.getItems()).toHaveLength(0);
    });
  });

  describe('applyDecay', () => {
    it('should reduce confidence of all items', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'drink',
          value: { description: 'coffee' },
          confidence: 0.8,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');

      service.applyDecay();

      const items = service.getItems();
      // Default decay rate is 0.95, so 0.8 * 0.95 = 0.76
      expect(items[0]?.confidence).toBeCloseTo(0.76, 2);
    });
  });

  describe('confidence labels', () => {
    it('should use correct confidence labels in LLM context', async () => {
      const mockResponse = JSON.stringify([
        {
          contextType: 'preference',
          key: 'high_item',
          value: { description: 'test high' },
          confidence: 0.8,
        },
        {
          contextType: 'preference',
          key: 'medium_item',
          value: { description: 'test medium' },
          confidence: 0.5,
        },
        {
          contextType: 'preference',
          key: 'low_item',
          value: { description: 'test low' },
          confidence: 0.35,
        },
      ]);
      (llmService.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: mockResponse,
      });

      await service.processEntry('entry-1', 'test');

      const context = service.getContextForLLM();
      expect(context).toContain('confidence: high');
      expect(context).toContain('confidence: medium');
      expect(context).toContain('confidence: low');
    });
  });
});
