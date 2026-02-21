import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeSchema } from '../infrastructure/database/schema.js';
import { type TopicRepositoryInterface, createTopicRepository } from './topic-repository.js';

describe('TopicRepository', () => {
  let db: Database.Database;
  let repository: TopicRepositoryInterface;

  const insertEntry = (id: string) => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO entries (id, timestamp, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, now, 'test content', now, now);
  };

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    repository = createTopicRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('upsert', () => {
    it('should create a new topic', () => {
      const topic = repository.upsert('work');
      expect(topic.name).toBe('work');
      expect(topic.total_count).toBe(1);
      expect(topic.id).toBeDefined();
    });

    it('should return existing topic if name already exists', () => {
      const first = repository.upsert('work');
      const second = repository.upsert('work');
      expect(first.id).toBe(second.id);
    });
  });

  describe('findByName', () => {
    it('should find topic by name', () => {
      repository.upsert('sleep');
      const found = repository.findByName('sleep');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('sleep');
    });

    it('should return null for non-existent topic', () => {
      const found = repository.findByName('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.upsert('work');
      repository.upsert('sleep');
      repository.upsert('coffee');
    });

    it('should return all topics', () => {
      const topics = repository.findAll();
      expect(topics).toHaveLength(3);
    });

    it('should respect limit parameter', () => {
      const topics = repository.findAll({ limit: 2 });
      expect(topics).toHaveLength(2);
    });

    it('should respect offset parameter', () => {
      const topics = repository.findAll({ limit: 2, offset: 1 });
      expect(topics).toHaveLength(2);
    });
  });

  describe('incrementCount', () => {
    it('should increment total_count by 1', () => {
      const topic = repository.upsert('work');
      const now = new Date();
      repository.incrementCount(topic.id, now);

      const updated = repository.findByName('work');
      expect(updated?.total_count).toBe(2);
    });

    it('should update last_seen timestamp', () => {
      const topic = repository.upsert('work');
      const future = new Date(Date.now() + 60000);
      repository.incrementCount(topic.id, future);

      const updated = repository.findByName('work');
      expect(updated?.last_seen).toBe(Math.floor(future.getTime() / 1000));
    });
  });

  describe('addEntryTopic', () => {
    it('should create entry-topic association', () => {
      insertEntry('entry-1');
      const topic = repository.upsert('work');
      repository.addEntryTopic('entry-1', topic.id, 1.0);

      const rows = db
        .prepare('SELECT * FROM entry_topics WHERE entry_id = ?')
        .all('entry-1') as Array<{ entry_id: string; topic_id: string; relevance: number }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.topic_id).toBe(topic.id);
      expect(rows[0]?.relevance).toBe(1.0);
    });

    it('should ignore duplicate entry-topic associations', () => {
      insertEntry('entry-1');
      const topic = repository.upsert('work');
      repository.addEntryTopic('entry-1', topic.id, 1.0);
      repository.addEntryTopic('entry-1', topic.id, 0.5);

      const rows = db
        .prepare('SELECT * FROM entry_topics WHERE entry_id = ?')
        .all('entry-1') as Array<{ entry_id: string }>;
      expect(rows).toHaveLength(1);
    });
  });

  describe('getTopicCountsForPeriod', () => {
    it('should return topic counts within period', () => {
      const topic1 = repository.upsert('work');
      const topic2 = repository.upsert('sleep');

      // Insert entries directly for the test
      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'e1',
        Math.floor(Date.now() / 1000),
        'test',
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      );
      db.prepare(`
        INSERT INTO entries (id, timestamp, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'e2',
        Math.floor(Date.now() / 1000),
        'test',
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      );

      repository.addEntryTopic('e1', topic1.id, 1.0);
      repository.addEntryTopic('e2', topic1.id, 1.0);
      repository.addEntryTopic('e1', topic2.id, 1.0);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const counts = repository.getTopicCountsForPeriod(weekAgo, now);

      expect(counts.length).toBeGreaterThan(0);
      const workCount = counts.find((c) => c.name === 'work');
      expect(workCount).toBeDefined();
      expect(workCount?.count).toBe(2);
    });

    it('should return empty array when no topics in period', () => {
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const farFuture2 = new Date(farFuture.getTime() + 24 * 60 * 60 * 1000);
      const counts = repository.getTopicCountsForPeriod(farFuture, farFuture2);
      expect(counts).toHaveLength(0);
    });
  });

  describe('getTopTopics', () => {
    it('should return topics ordered by total_count descending', () => {
      const t1 = repository.upsert('work');
      repository.upsert('sleep');

      // Increment work count
      repository.incrementCount(t1.id, new Date());
      repository.incrementCount(t1.id, new Date());

      const top = repository.getTopTopics(10);
      expect(top.length).toBeGreaterThanOrEqual(2);
      expect(top[0]?.topic.name).toBe('work');
      expect(top[0]?.count).toBe(3); // 1 initial + 2 increments
    });

    it('should respect limit parameter', () => {
      repository.upsert('work');
      repository.upsert('sleep');
      repository.upsert('coffee');

      const top = repository.getTopTopics(1);
      expect(top).toHaveLength(1);
    });
  });
});
