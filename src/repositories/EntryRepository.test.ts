import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import { EntryNotFoundError, InvalidEntryError } from '../infrastructure/errors/DomainErrors.js';
import { type EntryRepositoryInterface, createEntryRepository } from './EntryRepository.js';
import type { JournalEntry } from './types.js';

describe('EntryRepository', () => {
  let db: Database.Database;
  let repository: EntryRepositoryInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    repository = createEntryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  const createTestEntry = (): JournalEntry => ({
    id: 'test-id-123',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    content: 'Test content',
    metadata: { tags: ['test'] },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

  describe('insert', () => {
    it('should insert a new entry', () => {
      const entry = createTestEntry();
      repository.insert(entry);

      const found = repository.findById(entry.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(entry.id);
      expect(found?.content).toBe(entry.content);
    });

    it('should throw InvalidEntryError when ID is missing', () => {
      const entry = { ...createTestEntry(), id: '' };
      expect(() => repository.insert(entry)).toThrow(InvalidEntryError);
    });

    it('should throw InvalidEntryError when content is missing', () => {
      const entry = { ...createTestEntry(), content: '' };
      expect(() => repository.insert(entry)).toThrow(InvalidEntryError);
    });

    it('should throw InvalidEntryError for duplicate ID', () => {
      const entry = createTestEntry();
      repository.insert(entry);
      expect(() => repository.insert(entry)).toThrow(InvalidEntryError);
      expect(() => repository.insert(entry)).toThrow(/already exists/);
    });
  });

  describe('findById', () => {
    it('should find entry by ID', () => {
      const entry = createTestEntry();
      repository.insert(entry);

      const found = repository.findById(entry.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(entry.id);
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should deserialize metadata correctly', () => {
      const entry = createTestEntry();
      repository.insert(entry);

      const found = repository.findById(entry.id);
      expect(found?.metadata).toEqual(entry.metadata);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.insert({
        ...createTestEntry(),
        id: 'entry-1',
        timestamp: new Date('2024-01-01'),
        content: 'First entry',
      });
      repository.insert({
        ...createTestEntry(),
        id: 'entry-2',
        timestamp: new Date('2024-01-02'),
        content: 'Second entry',
      });
      repository.insert({
        ...createTestEntry(),
        id: 'entry-3',
        timestamp: new Date('2024-01-03'),
        content: 'Third entry',
      });
    });

    it('should return all entries', () => {
      const entries = repository.findAll();
      expect(entries).toHaveLength(3);
    });

    it('should sort by timestamp descending by default', () => {
      const entries = repository.findAll();
      expect(entries[0]?.id).toBe('entry-3');
      expect(entries[1]?.id).toBe('entry-2');
      expect(entries[2]?.id).toBe('entry-1');
    });

    it('should sort by timestamp ascending', () => {
      const entries = repository.findAll({ order: 'asc' });
      expect(entries[0]?.id).toBe('entry-1');
      expect(entries[1]?.id).toBe('entry-2');
      expect(entries[2]?.id).toBe('entry-3');
    });

    it('should limit results', () => {
      const entries = repository.findAll({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should offset results', () => {
      const entries = repository.findAll({ offset: 1, order: 'asc' });
      expect(entries).toHaveLength(2);
      expect(entries[0]?.id).toBe('entry-2');
    });

    it('should filter by since date', () => {
      const entries = repository.findAll({
        since: new Date('2024-01-02'),
      });
      expect(entries).toHaveLength(2);
    });

    it('should filter by until date', () => {
      const entries = repository.findAll({
        until: new Date('2024-01-02'),
      });
      expect(entries).toHaveLength(2);
    });

    it('should filter by date range', () => {
      const entries = repository.findAll({
        since: new Date('2024-01-02'),
        until: new Date('2024-01-02'),
      });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.id).toBe('entry-2');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.insert(createTestEntry());
    });

    it('should update content', () => {
      const updated = repository.update('test-id-123', {
        content: 'Updated content',
      });
      expect(updated.content).toBe('Updated content');
    });

    it('should update metadata', () => {
      const updated = repository.update('test-id-123', {
        metadata: { tags: ['updated'] },
      });
      expect(updated.metadata).toEqual({ tags: ['updated'] });
    });

    it('should update timestamp', () => {
      const newTimestamp = new Date('2024-02-01');
      const updated = repository.update('test-id-123', {
        timestamp: newTimestamp,
      });
      expect(updated.timestamp.getTime()).toBe(newTimestamp.getTime());
    });

    it('should update updatedAt timestamp', () => {
      const before = Math.floor(Date.now() / 1000) * 1000;
      const updated = repository.update('test-id-123', {
        content: 'Updated',
      });
      const after = Math.ceil(Date.now() / 1000) * 1000;

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('should preserve unchanged fields', () => {
      const original = repository.findById('test-id-123');
      const updated = repository.update('test-id-123', {
        content: 'Updated',
      });

      expect(updated.metadata).toEqual(original?.metadata);
      expect(updated.createdAt.getTime()).toBe(original?.createdAt.getTime());
    });

    it('should throw EntryNotFoundError for non-existent ID', () => {
      expect(() => repository.update('non-existent', { content: 'Updated' })).toThrow(
        EntryNotFoundError,
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      repository.insert(createTestEntry());
    });

    it('should delete entry by ID', () => {
      const result = repository.delete('test-id-123');
      expect(result).toBe(true);

      const found = repository.findById('test-id-123');
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 for empty database', () => {
      expect(repository.count()).toBe(0);
    });

    it('should count entries', () => {
      repository.insert({ ...createTestEntry(), id: 'entry-1' });
      repository.insert({ ...createTestEntry(), id: 'entry-2' });
      repository.insert({ ...createTestEntry(), id: 'entry-3' });

      expect(repository.count()).toBe(3);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      repository.insert({
        ...createTestEntry(),
        id: 'entry-1',
        content: 'The quick brown fox',
      });
      repository.insert({
        ...createTestEntry(),
        id: 'entry-2',
        content: 'jumps over the lazy dog',
      });
      repository.insert({
        ...createTestEntry(),
        id: 'entry-3',
        content: 'brown fox runs fast',
      });
    });

    it('should find entries matching query', () => {
      const results = repository.search('fox');
      expect(results).toHaveLength(2);
      expect(results[0]?.id).toMatch(/entry-[13]/);
      expect(results[1]?.id).toMatch(/entry-[13]/);
    });

    it('should return empty array when no matches', () => {
      const results = repository.search('elephant');
      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const results = repository.search('BROWN');
      expect(results).toHaveLength(2);
    });
  });
});
