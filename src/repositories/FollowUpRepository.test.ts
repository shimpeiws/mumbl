import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import type { FollowUp } from '../services/follow-up/types.js';
import {
  type FollowUpRepositoryInterface,
  createFollowUpRepository,
} from './FollowUpRepository.js';

describe('FollowUpRepository', () => {
  let db: Database.Database;
  let repository: FollowUpRepositoryInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    repository = createFollowUpRepository(db);

    // Insert a test entry for foreign key
    db.prepare(
      'INSERT INTO entries (id, timestamp, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('entry-1', 1704067200, 'Test entry', 1704067200, 1704067200);
    db.prepare(
      'INSERT INTO entries (id, timestamp, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('entry-2', 1704067200, 'Another entry', 1704067200, 1704067200);
  });

  afterEach(() => {
    db.close();
  });

  const createTestFollowUp = (overrides?: Partial<FollowUp>): FollowUp => ({
    id: 'follow-up-1',
    entryId: 'entry-1',
    scheduledAt: new Date('2024-01-02T00:00:00Z'),
    intervalType: '1d',
    status: 'pending',
    promptText: null,
    responseEntryId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    shownAt: null,
    ...overrides,
  });

  describe('insert', () => {
    it('should insert a follow-up', () => {
      const followUp = createTestFollowUp();
      repository.insert(followUp);

      const found = repository.findById(followUp.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(followUp.id);
      expect(found?.entryId).toBe(followUp.entryId);
      expect(found?.intervalType).toBe('1d');
      expect(found?.status).toBe('pending');
    });

    it('should insert with prompt text', () => {
      const followUp = createTestFollowUp({ promptText: 'How is that going?' });
      repository.insert(followUp);

      const found = repository.findById(followUp.id);
      expect(found?.promptText).toBe('How is that going?');
    });
  });

  describe('findById', () => {
    it('should find follow-up by ID', () => {
      const followUp = createTestFollowUp();
      repository.insert(followUp);

      const found = repository.findById(followUp.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(followUp.id);
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should convert timestamps to Date objects', () => {
      const followUp = createTestFollowUp();
      repository.insert(followUp);

      const found = repository.findById(followUp.id);
      expect(found?.scheduledAt).toBeInstanceOf(Date);
      expect(found?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findDue', () => {
    it('should find pending follow-ups where scheduledAt <= now', () => {
      repository.insert(
        createTestFollowUp({
          id: 'fu-1',
          scheduledAt: new Date('2024-01-02T00:00:00Z'),
        }),
      );
      repository.insert(
        createTestFollowUp({
          id: 'fu-2',
          scheduledAt: new Date('2024-01-05T00:00:00Z'),
        }),
      );

      const due = repository.findDue(new Date('2024-01-03T00:00:00Z'));
      expect(due).toHaveLength(1);
      expect(due[0]?.id).toBe('fu-1');
    });

    it('should not include non-pending follow-ups', () => {
      repository.insert(
        createTestFollowUp({
          id: 'fu-1',
          scheduledAt: new Date('2024-01-02T00:00:00Z'),
          status: 'shown',
        }),
      );

      const due = repository.findDue(new Date('2024-01-03T00:00:00Z'));
      expect(due).toHaveLength(0);
    });

    it('should return empty array when none are due', () => {
      repository.insert(
        createTestFollowUp({
          id: 'fu-1',
          scheduledAt: new Date('2024-01-10T00:00:00Z'),
        }),
      );

      const due = repository.findDue(new Date('2024-01-03T00:00:00Z'));
      expect(due).toHaveLength(0);
    });
  });

  describe('findByEntryId', () => {
    it('should find follow-ups for a specific entry', () => {
      repository.insert(createTestFollowUp({ id: 'fu-1', entryId: 'entry-1' }));
      repository.insert(createTestFollowUp({ id: 'fu-2', entryId: 'entry-2' }));

      const results = repository.findByEntryId('entry-1');
      expect(results).toHaveLength(1);
      expect(results[0]?.entryId).toBe('entry-1');
    });

    it('should return empty array for entry with no follow-ups', () => {
      const results = repository.findByEntryId('entry-999');
      expect(results).toHaveLength(0);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.insert(createTestFollowUp());
    });

    it('should update status', () => {
      const updated = repository.update('follow-up-1', { status: 'shown' });
      expect(updated?.status).toBe('shown');
    });

    it('should update shownAt', () => {
      const shownAt = new Date('2024-01-02T12:00:00Z');
      const updated = repository.update('follow-up-1', { shownAt });
      expect(updated?.shownAt).toBeInstanceOf(Date);
      expect(updated?.shownAt?.getTime()).toBe(shownAt.getTime());
    });

    it('should update responseEntryId', () => {
      const updated = repository.update('follow-up-1', {
        responseEntryId: 'entry-2',
      });
      expect(updated?.responseEntryId).toBe('entry-2');
    });

    it('should return null for non-existent ID', () => {
      const updated = repository.update('non-existent', { status: 'shown' });
      expect(updated).toBeNull();
    });

    it('should return current state when no fields provided', () => {
      const result = repository.update('follow-up-1', {});
      expect(result?.id).toBe('follow-up-1');
    });
  });

  describe('findAll', () => {
    it('should return all follow-ups', () => {
      repository.insert(createTestFollowUp({ id: 'fu-1' }));
      repository.insert(createTestFollowUp({ id: 'fu-2' }));

      const all = repository.findAll();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when none exist', () => {
      const all = repository.findAll();
      expect(all).toHaveLength(0);
    });
  });
});
