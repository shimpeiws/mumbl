import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../../infrastructure/database/schema.js';
import type { LLMServiceInterface } from '../llm/LLMService.js';
import {
  type ConversationServiceInterface,
  createConversationService,
} from './ConversationService.js';

function createMockLLMService(): LLMServiceInterface {
  return {
    chat: vi.fn().mockResolvedValue({ content: 'response', model: 'test' }),
    chatWithContext: vi.fn().mockResolvedValue({ content: 'contextual', model: 'test' }),
    stream: vi.fn(),
    summarize: vi.fn().mockResolvedValue({ content: 'summary', model: 'test' }),
    reflect: vi.fn().mockResolvedValue({ content: 'reflection', model: 'test' }),
    react: vi.fn().mockResolvedValue({ content: 'reaction', model: 'test' }),
    healthCheck: vi.fn().mockResolvedValue({ primary: true }),
    clearHistory: vi.fn(),
    getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
  };
}

describe('ConversationService', () => {
  let db: Database.Database;
  let mockLLM: LLMServiceInterface;
  let service: ConversationServiceInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    mockLLM = createMockLLMService();
    service = createConversationService(db, mockLLM);
  });

  afterEach(() => {
    db.close();
  });

  describe('startConversation', () => {
    it('should create a new conversation', () => {
      const conversation = service.startConversation('Test Thread');

      expect(conversation.id).toBeDefined();
      expect(conversation.title).toBe('Test Thread');
      expect(conversation.status).toBe('active');
    });

    it('should create conversation with null title when not provided', () => {
      const conversation = service.startConversation();

      expect(conversation.title).toBeNull();
    });

    it('should persist conversation to database', () => {
      const conversation = service.startConversation('Persisted');

      const found = service.listConversations();
      expect(found).toHaveLength(1);
      expect(found[0]?.id).toBe(conversation.id);
    });
  });

  describe('addEntry', () => {
    it('should add entry to a conversation', () => {
      const conversation = service.startConversation();

      // Insert an entry into the entries table
      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES ('entry-1', 1704067200, 'Hello world', 1704067200, 1704067200)
      `).run();

      service.addEntry(conversation.id, 'entry-1', 'Hello world');

      const context = service.getContext(conversation.id);
      expect(context?.entries).toHaveLength(1);
      expect(context?.entries[0]?.entryId).toBe('entry-1');
      expect(context?.entries[0]?.content).toBe('Hello world');
    });

    it('should assign sequential positions', () => {
      const conversation = service.startConversation();

      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES ('entry-1', 1704067200, 'First', 1704067200, 1704067200)
      `).run();
      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES ('entry-2', 1704153600, 'Second', 1704153600, 1704153600)
      `).run();

      service.addEntry(conversation.id, 'entry-1', 'First');
      service.addEntry(conversation.id, 'entry-2', 'Second');

      const context = service.getContext(conversation.id);
      expect(context?.entries[0]?.position).toBe(0);
      expect(context?.entries[1]?.position).toBe(1);
    });
  });

  describe('getContext', () => {
    it('should return null for non-existent conversation', () => {
      const context = service.getContext('non-existent');
      expect(context).toBeNull();
    });

    it('should return conversation with entries and memory', () => {
      const conversation = service.startConversation('Context Test');

      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES ('entry-1', 1704067200, 'Test content', 1704067200, 1704067200)
      `).run();

      service.addEntry(conversation.id, 'entry-1', 'Test content');

      const context = service.getContext(conversation.id);
      expect(context).not.toBeNull();
      expect(context?.conversation.id).toBe(conversation.id);
      expect(context?.entries).toHaveLength(1);
      expect(context?.memory).toBeDefined();
    });
  });

  describe('getActiveConversation', () => {
    it('should return null when no active conversations', () => {
      const active = service.getActiveConversation();
      expect(active).toBeNull();
    });

    it('should return most recently updated active conversation', () => {
      const first = service.startConversation('First');
      service.startConversation('Second');

      // Add an entry to the first conversation to update its timestamp
      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES ('entry-up', 1704067200, 'Update', 1704067200, 1704067200)
      `).run();
      service.addEntry(first.id, 'entry-up', 'Update');

      const active = service.getActiveConversation();
      expect(active?.id).toBe(first.id);
    });

    it('should not return archived conversations', () => {
      const conversation = service.startConversation('Archived');
      service.archive(conversation.id);

      const active = service.getActiveConversation();
      expect(active).toBeNull();
    });
  });

  describe('archive', () => {
    it('should archive a conversation', () => {
      const conversation = service.startConversation();
      service.archive(conversation.id);

      const conversations = service.listConversations();
      expect(conversations[0]?.status).toBe('archived');
    });
  });

  describe('listConversations', () => {
    it('should list all conversations', () => {
      service.startConversation('First');
      service.startConversation('Second');
      service.startConversation('Third');

      const conversations = service.listConversations();
      expect(conversations).toHaveLength(3);
    });

    it('should support limit option', () => {
      service.startConversation('First');
      service.startConversation('Second');
      service.startConversation('Third');

      const conversations = service.listConversations({ limit: 2 });
      expect(conversations).toHaveLength(2);
    });
  });
});
