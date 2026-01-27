import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import { EntryService } from './entry-service.js';

describe('EntryService', () => {
  let db: Database.Database;
  let service: EntryService;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    service = new EntryService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a new entry with auto-generated ID', () => {
      const entry = service.create({
        content: 'Test content',
      });

      expect(entry.id).toBeDefined();
      expect(entry.content).toBe('Test content');
      expect(entry.metadata).toEqual({});
    });

    it('should use provided timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const entry = service.create({
        content: 'Test',
        timestamp,
      });

      expect(entry.timestamp.getTime()).toBe(timestamp.getTime());
    });

    it('should use current time if timestamp not provided', () => {
      const before = Date.now();
      const entry = service.create({ content: 'Test' });
      const after = Date.now();

      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should save metadata', () => {
      const entry = service.create({
        content: 'Test',
        metadata: { tags: ['work', 'project'] },
      });

      expect(entry.metadata).toEqual({ tags: ['work', 'project'] });
    });
  });

  describe('getById', () => {
    it('should retrieve created entry', () => {
      const created = service.create({ content: 'Test' });
      const retrieved = service.getById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', () => {
      const retrieved = service.getById('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      service.create({
        content: 'First',
        timestamp: new Date('2024-01-01'),
      });
      service.create({
        content: 'Second',
        timestamp: new Date('2024-01-02'),
      });
      service.create({
        content: 'Third',
        timestamp: new Date('2024-01-03'),
      });
    });

    it('should list all entries', () => {
      const entries = service.list();
      expect(entries).toHaveLength(3);
    });

    it('should respect limit', () => {
      const entries = service.list({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should respect offset', () => {
      const entries = service.list({ offset: 1, order: 'asc' });
      expect(entries).toHaveLength(2);
      expect(entries[0]?.content).toBe('Second');
    });

    it('should filter by date range', () => {
      const entries = service.list({
        since: new Date('2024-01-02'),
        until: new Date('2024-01-02'),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]?.content).toBe('Second');
    });
  });

  describe('update', () => {
    it('should update entry content', () => {
      const created = service.create({ content: 'Original' });
      const updated = service.update(created.id, {
        content: 'Updated',
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe('Updated');
    });

    it('should return null for non-existent ID', () => {
      const updated = service.update('non-existent', {
        content: 'Updated',
      });
      expect(updated).toBeNull();
    });

    it('should preserve unchanged fields', () => {
      const created = service.create({
        content: 'Original',
        metadata: { tags: ['test'] },
      });

      const updated = service.update(created.id, {
        content: 'Updated',
      });

      expect(updated?.metadata).toEqual({ tags: ['test'] });
    });
  });

  describe('delete', () => {
    it('should delete entry', () => {
      const created = service.create({ content: 'Test' });
      const result = service.delete(created.id);

      expect(result).toBe(true);
      expect(service.getById(created.id)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = service.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entries', () => {
      expect(service.count()).toBe(0);

      service.create({ content: 'First' });
      expect(service.count()).toBe(1);

      service.create({ content: 'Second' });
      expect(service.count()).toBe(2);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      service.create({ content: 'The quick brown fox' });
      service.create({ content: 'jumps over the lazy dog' });
      service.create({ content: 'brown fox runs fast' });
    });

    it('should find matching entries', () => {
      const results = service.search('fox');
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const results = service.search('elephant');
      expect(results).toHaveLength(0);
    });
  });
});
