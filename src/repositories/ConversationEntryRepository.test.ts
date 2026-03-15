import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import {
  type ConversationEntryRepositoryInterface,
  createConversationEntryRepository,
} from './ConversationEntryRepository.js';

describe('ConversationEntryRepository', () => {
  let db: Database.Database;
  let repository: ConversationEntryRepositoryInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);

    // Insert a conversation and entries for foreign key constraints
    db.prepare(`
      INSERT INTO conversations (id, title, started_at, updated_at, status)
      VALUES ('conv-1', 'Test', 1704067200, 1704067200, 'active')
    `).run();

    db.prepare(`
      INSERT INTO entries (id, timestamp, content, created_at, updated_at)
      VALUES ('entry-1', 1704067200, 'Entry 1', 1704067200, 1704067200)
    `).run();

    db.prepare(`
      INSERT INTO entries (id, timestamp, content, created_at, updated_at)
      VALUES ('entry-2', 1704153600, 'Entry 2', 1704153600, 1704153600)
    `).run();

    db.prepare(`
      INSERT INTO entries (id, timestamp, content, created_at, updated_at)
      VALUES ('entry-3', 1704240000, 'Entry 3', 1704240000, 1704240000)
    `).run();

    repository = createConversationEntryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('addEntry', () => {
    it('should add an entry to a conversation', () => {
      repository.addEntry('conv-1', 'entry-1', 0);

      const entries = repository.getEntriesForConversation('conv-1');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.entryId).toBe('entry-1');
      expect(entries[0]?.position).toBe(0);
    });

    it('should add multiple entries with different positions', () => {
      repository.addEntry('conv-1', 'entry-1', 0);
      repository.addEntry('conv-1', 'entry-2', 1);
      repository.addEntry('conv-1', 'entry-3', 2);

      const entries = repository.getEntriesForConversation('conv-1');
      expect(entries).toHaveLength(3);
      expect(entries[0]?.position).toBe(0);
      expect(entries[1]?.position).toBe(1);
      expect(entries[2]?.position).toBe(2);
    });
  });

  describe('getEntriesForConversation', () => {
    it('should return entries ordered by position', () => {
      repository.addEntry('conv-1', 'entry-3', 2);
      repository.addEntry('conv-1', 'entry-1', 0);
      repository.addEntry('conv-1', 'entry-2', 1);

      const entries = repository.getEntriesForConversation('conv-1');
      expect(entries[0]?.entryId).toBe('entry-1');
      expect(entries[1]?.entryId).toBe('entry-2');
      expect(entries[2]?.entryId).toBe('entry-3');
    });

    it('should return empty array for non-existent conversation', () => {
      const entries = repository.getEntriesForConversation('non-existent');
      expect(entries).toHaveLength(0);
    });
  });

  describe('getConversationForEntry', () => {
    it('should find the conversation for an entry', () => {
      repository.addEntry('conv-1', 'entry-1', 0);

      const convId = repository.getConversationForEntry('entry-1');
      expect(convId).toBe('conv-1');
    });

    it('should return null when entry is not in any conversation', () => {
      const convId = repository.getConversationForEntry('entry-1');
      expect(convId).toBeNull();
    });
  });

  describe('removeEntry', () => {
    it('should remove an entry from a conversation', () => {
      repository.addEntry('conv-1', 'entry-1', 0);
      repository.addEntry('conv-1', 'entry-2', 1);

      const result = repository.removeEntry('conv-1', 'entry-1');
      expect(result).toBe(true);

      const entries = repository.getEntriesForConversation('conv-1');
      expect(entries).toHaveLength(1);
      expect(entries[0]?.entryId).toBe('entry-2');
    });

    it('should return false when entry not found', () => {
      const result = repository.removeEntry('conv-1', 'entry-1');
      expect(result).toBe(false);
    });
  });

  describe('getNextPosition', () => {
    it('should return 0 for empty conversation', () => {
      const position = repository.getNextPosition('conv-1');
      expect(position).toBe(0);
    });

    it('should return next position after existing entries', () => {
      repository.addEntry('conv-1', 'entry-1', 0);
      repository.addEntry('conv-1', 'entry-2', 1);

      const position = repository.getNextPosition('conv-1');
      expect(position).toBe(2);
    });

    it('should handle gaps in positions', () => {
      repository.addEntry('conv-1', 'entry-1', 0);
      repository.addEntry('conv-1', 'entry-2', 5);

      const position = repository.getNextPosition('conv-1');
      expect(position).toBe(6);
    });
  });
});
