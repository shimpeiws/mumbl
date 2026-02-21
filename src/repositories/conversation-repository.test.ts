import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import {
  type Conversation,
  type ConversationRepositoryInterface,
  createConversationRepository,
} from './conversation-repository.js';

describe('ConversationRepository', () => {
  let db: Database.Database;
  let repository: ConversationRepositoryInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    repository = createConversationRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  const createTestConversation = (overrides?: Partial<Conversation>): Conversation => ({
    id: 'conv-123',
    title: 'Test Conversation',
    startedAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    status: 'active',
    metadata: {},
    ...overrides,
  });

  describe('insert', () => {
    it('should insert a new conversation', () => {
      const conversation = createTestConversation();
      repository.insert(conversation);

      const found = repository.findById(conversation.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(conversation.id);
      expect(found?.title).toBe(conversation.title);
      expect(found?.status).toBe('active');
    });

    it('should insert with null title', () => {
      const conversation = createTestConversation({ title: null });
      repository.insert(conversation);

      const found = repository.findById(conversation.id);
      expect(found?.title).toBeNull();
    });

    it('should store metadata as JSON', () => {
      const conversation = createTestConversation({ metadata: { key: 'value' } });
      repository.insert(conversation);

      const found = repository.findById(conversation.id);
      expect(found?.metadata).toEqual({ key: 'value' });
    });
  });

  describe('findById', () => {
    it('should find conversation by ID', () => {
      const conversation = createTestConversation();
      repository.insert(conversation);

      const found = repository.findById(conversation.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(conversation.id);
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should convert timestamps to Date objects', () => {
      const conversation = createTestConversation();
      repository.insert(conversation);

      const found = repository.findById(conversation.id);
      expect(found?.startedAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.insert(
        createTestConversation({
          id: 'conv-1',
          updatedAt: new Date('2024-01-01'),
        }),
      );
      repository.insert(
        createTestConversation({
          id: 'conv-2',
          updatedAt: new Date('2024-01-03'),
        }),
      );
      repository.insert(
        createTestConversation({
          id: 'conv-3',
          updatedAt: new Date('2024-01-02'),
        }),
      );
    });

    it('should return all conversations ordered by updated_at desc', () => {
      const conversations = repository.findAll();
      expect(conversations).toHaveLength(3);
      expect(conversations[0]?.id).toBe('conv-2');
      expect(conversations[1]?.id).toBe('conv-3');
      expect(conversations[2]?.id).toBe('conv-1');
    });

    it('should limit results', () => {
      const conversations = repository.findAll({ limit: 2 });
      expect(conversations).toHaveLength(2);
    });

    it('should offset results', () => {
      const conversations = repository.findAll({ limit: 2, offset: 1 });
      expect(conversations).toHaveLength(2);
      expect(conversations[0]?.id).toBe('conv-3');
    });
  });

  describe('findActive', () => {
    it('should return only active conversations', () => {
      repository.insert(createTestConversation({ id: 'conv-1', status: 'active' }));
      repository.insert(createTestConversation({ id: 'conv-2', status: 'archived' }));
      repository.insert(createTestConversation({ id: 'conv-3', status: 'active' }));

      const active = repository.findActive();
      expect(active).toHaveLength(2);
      expect(active.every((c) => c.status === 'active')).toBe(true);
    });

    it('should return empty array when no active conversations', () => {
      repository.insert(createTestConversation({ id: 'conv-1', status: 'archived' }));

      const active = repository.findActive();
      expect(active).toHaveLength(0);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.insert(createTestConversation());
    });

    it('should update title', () => {
      repository.update('conv-123', { title: 'Updated Title' });

      const found = repository.findById('conv-123');
      expect(found?.title).toBe('Updated Title');
    });

    it('should update status', () => {
      repository.update('conv-123', { status: 'archived' });

      const found = repository.findById('conv-123');
      expect(found?.status).toBe('archived');
    });

    it('should update metadata', () => {
      repository.update('conv-123', { metadata: { updated: true } });

      const found = repository.findById('conv-123');
      expect(found?.metadata).toEqual({ updated: true });
    });

    it('should update updated_at timestamp', () => {
      const before = Math.floor(Date.now() / 1000) * 1000;
      repository.update('conv-123', { title: 'Updated' });
      const after = Math.ceil(Date.now() / 1000) * 1000;

      const found = repository.findById('conv-123');
      expect(found?.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(found?.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('archive', () => {
    it('should set status to archived', () => {
      repository.insert(createTestConversation());
      repository.archive('conv-123');

      const found = repository.findById('conv-123');
      expect(found?.status).toBe('archived');
    });
  });

  describe('delete', () => {
    it('should delete conversation', () => {
      repository.insert(createTestConversation());
      const result = repository.delete('conv-123');

      expect(result).toBe(true);
      expect(repository.findById('conv-123')).toBeNull();
    });

    it('should return false for non-existent conversation', () => {
      const result = repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
