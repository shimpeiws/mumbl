import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import {
  type UserContextRepositoryInterface,
  createUserContextRepository,
} from './UserContextRepository.js';

describe('UserContextRepository', () => {
  let db: Database.Database;
  let repository: UserContextRepositoryInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    repository = createUserContextRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('upsert', () => {
    it('should insert a new context item', () => {
      const row = repository.upsert({
        contextType: 'preference',
        key: 'favorite_drink',
        value: '{"description":"likes coffee"}',
        confidence: 0.7,
        sourceCount: 1,
      });

      expect(row.id).toBeDefined();
      expect(row.context_type).toBe('preference');
      expect(row.key).toBe('favorite_drink');
      expect(row.value).toBe('{"description":"likes coffee"}');
      expect(row.confidence).toBe(0.7);
      expect(row.source_count).toBe(1);
      expect(row.is_private).toBe(0);
    });

    it('should update existing item with same type and key', () => {
      repository.upsert({
        contextType: 'preference',
        key: 'favorite_drink',
        value: '{"description":"likes coffee"}',
        confidence: 0.5,
        sourceCount: 1,
      });

      const updated = repository.upsert({
        contextType: 'preference',
        key: 'favorite_drink',
        value: '{"description":"loves coffee"}',
        confidence: 0.6,
        sourceCount: 1,
      });

      expect(updated.value).toBe('{"description":"loves coffee"}');
      expect(updated.source_count).toBe(2);
      // Confidence should merge: 0.5 + 0.6 * 0.3 = 0.68
      expect(updated.confidence).toBeCloseTo(0.68, 2);
    });

    it('should cap confidence at 1.0', () => {
      repository.upsert({
        contextType: 'profile',
        key: 'role',
        value: '{"description":"engineer"}',
        confidence: 0.9,
        sourceCount: 1,
      });

      const updated = repository.upsert({
        contextType: 'profile',
        key: 'role',
        value: '{"description":"engineer"}',
        confidence: 0.9,
        sourceCount: 1,
      });

      expect(updated.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('findByTypeAndKey', () => {
    it('should find item by type and key', () => {
      repository.upsert({
        contextType: 'pattern',
        key: 'work_schedule',
        value: '{"description":"works late"}',
        confidence: 0.6,
        sourceCount: 1,
      });

      const found = repository.findByTypeAndKey('pattern', 'work_schedule');
      expect(found).not.toBeNull();
      expect(found?.key).toBe('work_schedule');
    });

    it('should return null for non-existent item', () => {
      const found = repository.findByTypeAndKey('profile', 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.upsert({
        contextType: 'preference',
        key: 'drink',
        value: '{"description":"coffee"}',
        confidence: 0.8,
        sourceCount: 1,
      });
      repository.upsert({
        contextType: 'pattern',
        key: 'sleep',
        value: '{"description":"late sleeper"}',
        confidence: 0.3,
        sourceCount: 1,
      });
      const row = repository.upsert({
        contextType: 'profile',
        key: 'name',
        value: '{"description":"John"}',
        confidence: 0.9,
        sourceCount: 1,
      });
      repository.update(row.id, { isPrivate: 1 });
    });

    it('should return all non-private items by default', () => {
      const items = repository.findAll();
      expect(items).toHaveLength(2);
    });

    it('should include private items when requested', () => {
      const items = repository.findAll({ includePrivate: true });
      expect(items).toHaveLength(3);
    });

    it('should filter by type', () => {
      const items = repository.findAll({ type: 'preference', includePrivate: true });
      expect(items).toHaveLength(1);
      expect(items[0]?.context_type).toBe('preference');
    });

    it('should filter by minimum confidence', () => {
      const items = repository.findAll({ minConfidence: 0.5, includePrivate: true });
      expect(items).toHaveLength(2);
    });

    it('should order by confidence descending', () => {
      const items = repository.findAll({ includePrivate: true });
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];
        if (prev && curr) {
          expect(prev.confidence).toBeGreaterThanOrEqual(curr.confidence);
        }
      }
    });
  });

  describe('update', () => {
    it('should update confidence', () => {
      const row = repository.upsert({
        contextType: 'preference',
        key: 'drink',
        value: '{"description":"tea"}',
        confidence: 0.5,
        sourceCount: 1,
      });

      repository.update(row.id, { confidence: 0.9 });

      const found = repository.findByTypeAndKey('preference', 'drink');
      expect(found?.confidence).toBe(0.9);
    });

    it('should update isPrivate', () => {
      const row = repository.upsert({
        contextType: 'profile',
        key: 'email',
        value: '{"description":"test@example.com"}',
        confidence: 0.9,
        sourceCount: 1,
      });

      repository.update(row.id, { isPrivate: 1 });

      const found = repository.findByTypeAndKey('profile', 'email');
      expect(found?.is_private).toBe(1);
    });

    it('should do nothing with empty updates', () => {
      const row = repository.upsert({
        contextType: 'preference',
        key: 'drink',
        value: '{"description":"tea"}',
        confidence: 0.5,
        sourceCount: 1,
      });

      repository.update(row.id, {});

      const found = repository.findByTypeAndKey('preference', 'drink');
      expect(found?.confidence).toBe(0.5);
    });
  });

  describe('delete', () => {
    it('should delete an item', () => {
      const row = repository.upsert({
        contextType: 'preference',
        key: 'drink',
        value: '{"description":"tea"}',
        confidence: 0.5,
        sourceCount: 1,
      });

      const deleted = repository.delete(row.id);
      expect(deleted).toBe(true);

      const found = repository.findByTypeAndKey('preference', 'drink');
      expect(found).toBeNull();
    });

    it('should return false for non-existent item', () => {
      const deleted = repository.delete('nonexistent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('applyDecay', () => {
    it('should multiply all confidence values by decay rate', () => {
      repository.upsert({
        contextType: 'preference',
        key: 'drink',
        value: '{"description":"coffee"}',
        confidence: 0.8,
        sourceCount: 1,
      });
      repository.upsert({
        contextType: 'pattern',
        key: 'sleep',
        value: '{"description":"late"}',
        confidence: 0.6,
        sourceCount: 1,
      });

      repository.applyDecay(0.95);

      const items = repository.findAll({ includePrivate: true });
      const drinkItem = items.find((i) => i.key === 'drink');
      const sleepItem = items.find((i) => i.key === 'sleep');

      expect(drinkItem?.confidence).toBeCloseTo(0.76, 2);
      expect(sleepItem?.confidence).toBeCloseTo(0.57, 2);
    });
  });

  describe('count', () => {
    it('should return 0 for empty repository', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count', () => {
      repository.upsert({
        contextType: 'preference',
        key: 'a',
        value: '{}',
        confidence: 0.5,
        sourceCount: 1,
      });
      repository.upsert({
        contextType: 'pattern',
        key: 'b',
        value: '{}',
        confidence: 0.5,
        sourceCount: 1,
      });

      expect(repository.count()).toBe(2);
    });
  });
});
