import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../storage/schema.js';
import { EntryManager } from './entry-manager.js';

describe('EntryManager', () => {
  let db: Database.Database;
  let manager: EntryManager;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    manager = new EntryManager(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a new entry with auto-generated ID', () => {
      const entry = manager.create({
        content: 'Test content',
      });

      expect(entry.id).toBeDefined();
      expect(entry.content).toBe('Test content');
      expect(entry.metadata).toEqual({});
    });

    it('should use provided timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const entry = manager.create({
        content: 'Test',
        timestamp,
      });

      expect(entry.timestamp.getTime()).toBe(timestamp.getTime());
    });

    it('should use current time if timestamp not provided', () => {
      const before = Date.now();
      const entry = manager.create({ content: 'Test' });
      const after = Date.now();

      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should save metadata', () => {
      const entry = manager.create({
        content: 'Test',
        metadata: { tags: ['work', 'project'] },
      });

      expect(entry.metadata).toEqual({ tags: ['work', 'project'] });
    });
  });

  describe('getById', () => {
    it('should retrieve created entry', () => {
      const created = manager.create({ content: 'Test' });
      const retrieved = manager.getById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', () => {
      const retrieved = manager.getById('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      manager.create({
        content: 'First',
        timestamp: new Date('2024-01-01'),
      });
      manager.create({
        content: 'Second',
        timestamp: new Date('2024-01-02'),
      });
      manager.create({
        content: 'Third',
        timestamp: new Date('2024-01-03'),
      });
    });

    it('should list all entries', () => {
      const entries = manager.list();
      expect(entries).toHaveLength(3);
    });

    it('should respect limit', () => {
      const entries = manager.list({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should respect offset', () => {
      const entries = manager.list({ offset: 1, order: 'asc' });
      expect(entries).toHaveLength(2);
      expect(entries[0]?.content).toBe('Second');
    });

    it('should filter by date range', () => {
      const entries = manager.list({
        since: new Date('2024-01-02'),
        until: new Date('2024-01-02'),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]?.content).toBe('Second');
    });
  });

  describe('update', () => {
    it('should update entry content', () => {
      const created = manager.create({ content: 'Original' });
      const updated = manager.update(created.id, {
        content: 'Updated',
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe('Updated');
    });

    it('should return null for non-existent ID', () => {
      const updated = manager.update('non-existent', {
        content: 'Updated',
      });
      expect(updated).toBeNull();
    });

    it('should preserve unchanged fields', () => {
      const created = manager.create({
        content: 'Original',
        metadata: { tags: ['test'] },
      });

      const updated = manager.update(created.id, {
        content: 'Updated',
      });

      expect(updated?.metadata).toEqual({ tags: ['test'] });
    });
  });

  describe('delete', () => {
    it('should delete entry', () => {
      const created = manager.create({ content: 'Test' });
      const result = manager.delete(created.id);

      expect(result).toBe(true);
      expect(manager.getById(created.id)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = manager.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entries', () => {
      expect(manager.count()).toBe(0);

      manager.create({ content: 'First' });
      expect(manager.count()).toBe(1);

      manager.create({ content: 'Second' });
      expect(manager.count()).toBe(2);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      manager.create({ content: 'The quick brown fox' });
      manager.create({ content: 'jumps over the lazy dog' });
      manager.create({ content: 'brown fox runs fast' });
    });

    it('should find matching entries', () => {
      const results = manager.search('fox');
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const results = manager.search('elephant');
      expect(results).toHaveLength(0);
    });
  });
});
