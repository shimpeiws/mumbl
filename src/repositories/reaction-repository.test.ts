import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import { ReactionRepository } from './reaction-repository.js';
import type { Reaction } from './types.js';

describe('ReactionRepository', () => {
  let db: Database.Database;
  let repository: ReactionRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    repository = new ReactionRepository(db);

    // Insert a test entry for foreign key
    db.prepare(
      `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('entry-1', Date.now() / 1000, 'Test content', '{}', Date.now() / 1000, Date.now() / 1000);

    db.prepare(
      `INSERT INTO entries (id, timestamp, content, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('entry-2', Date.now() / 1000, 'Test content 2', '{}', Date.now() / 1000, Date.now() / 1000);
  });

  afterEach(() => {
    db.close();
  });

  describe('insert', () => {
    it('should insert a reaction', () => {
      const reaction: Reaction = {
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'read',
        content: '·',
        createdAt: new Date(),
      };

      repository.insert(reaction);

      const result = repository.findByEntryId('entry-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('reaction-1');
      expect(result?.content).toBe('·');
      expect(result?.reactionType).toBe('read');
    });
  });

  describe('findByEntryId', () => {
    it('should return null for entry without reaction', () => {
      const result = repository.findByEntryId('entry-1');
      expect(result).toBeNull();
    });

    it('should return reaction for entry', () => {
      const reaction: Reaction = {
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'heard',
        content: 'hearing you',
        createdAt: new Date(),
      };

      repository.insert(reaction);

      const result = repository.findByEntryId('entry-1');
      expect(result).not.toBeNull();
      expect(result?.content).toBe('hearing you');
    });

    it('should return most recent reaction when multiple exist', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);

      repository.insert({
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'read',
        content: '·',
        createdAt: now,
      });

      repository.insert({
        id: 'reaction-2',
        entryId: 'entry-1',
        reactionType: 'heard',
        content: 'hearing you',
        createdAt: later,
      });

      const result = repository.findByEntryId('entry-1');
      expect(result?.content).toBe('hearing you');
    });
  });

  describe('findByEntryIds', () => {
    it('should return empty map for empty array', () => {
      const result = repository.findByEntryIds([]);
      expect(result.size).toBe(0);
    });

    it('should return reactions for multiple entries', () => {
      repository.insert({
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'read',
        content: '·',
        createdAt: new Date(),
      });

      repository.insert({
        id: 'reaction-2',
        entryId: 'entry-2',
        reactionType: 'heard',
        content: 'hearing you',
        createdAt: new Date(),
      });

      const result = repository.findByEntryIds(['entry-1', 'entry-2']);
      expect(result.size).toBe(2);
      expect(result.get('entry-1')?.content).toBe('·');
      expect(result.get('entry-2')?.content).toBe('hearing you');
    });

    it('should only return reactions for entries that have them', () => {
      repository.insert({
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'read',
        content: '·',
        createdAt: new Date(),
      });

      const result = repository.findByEntryIds(['entry-1', 'entry-2']);
      expect(result.size).toBe(1);
      expect(result.has('entry-1')).toBe(true);
      expect(result.has('entry-2')).toBe(false);
    });
  });

  describe('deleteByEntryId', () => {
    it('should return false for entry without reaction', () => {
      const result = repository.deleteByEntryId('entry-1');
      expect(result).toBe(false);
    });

    it('should delete reaction and return true', () => {
      repository.insert({
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'read',
        content: '·',
        createdAt: new Date(),
      });

      const result = repository.deleteByEntryId('entry-1');
      expect(result).toBe(true);
      expect(repository.findByEntryId('entry-1')).toBeNull();
    });
  });

  describe('count', () => {
    it('should return 0 for empty table', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count', () => {
      repository.insert({
        id: 'reaction-1',
        entryId: 'entry-1',
        reactionType: 'read',
        content: '·',
        createdAt: new Date(),
      });

      repository.insert({
        id: 'reaction-2',
        entryId: 'entry-2',
        reactionType: 'heard',
        content: 'hearing you',
        createdAt: new Date(),
      });

      expect(repository.count()).toBe(2);
    });
  });
});
