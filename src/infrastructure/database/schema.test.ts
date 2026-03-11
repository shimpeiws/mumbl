import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SCHEMA_VERSION,
  getSchemaVersion,
  initializeSchema,
  migrateToVersion2,
  migrateToVersion3,
  migrateToVersion4,
  migrateToVersion5,
  runMigrations,
} from './schema.js';

describe('schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('SCHEMA_VERSION', () => {
    it('should be 5', () => {
      expect(SCHEMA_VERSION).toBe(5);
    });
  });

  describe('initializeSchema', () => {
    it('should create all expected tables', () => {
      initializeSchema(db);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('entries');
      expect(tableNames).toContain('reactions');
      expect(tableNames).toContain('conversations');
      expect(tableNames).toContain('conversation_entries');
      expect(tableNames).toContain('conversation_memory');
      expect(tableNames).toContain('topics');
      expect(tableNames).toContain('entry_topics');
      expect(tableNames).toContain('trend_summaries');
      expect(tableNames).toContain('user_context');
      expect(tableNames).toContain('follow_ups');
      expect(tableNames).toContain('schema_version');
    });

    it('should set schema version to latest', () => {
      initializeSchema(db);
      expect(getSchemaVersion(db)).toBe(SCHEMA_VERSION);
    });

    it('should be idempotent', () => {
      initializeSchema(db);
      initializeSchema(db);
      expect(getSchemaVersion(db)).toBe(SCHEMA_VERSION);
    });
  });

  describe('getSchemaVersion', () => {
    it('should return 0 when schema_version table is empty', () => {
      db.exec('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)');
      expect(getSchemaVersion(db)).toBe(0);
    });

    it('should return the stored version', () => {
      db.exec('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)');
      db.exec('INSERT INTO schema_version (version) VALUES (3)');
      expect(getSchemaVersion(db)).toBe(3);
    });
  });

  describe('runMigrations', () => {
    it('should insert initial version for new database', () => {
      initializeSchema(db);
      expect(getSchemaVersion(db)).toBe(SCHEMA_VERSION);
    });

    it('should migrate from version 1 to latest', () => {
      db.exec(`CREATE TABLE entries (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )`);
      db.exec('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)');
      db.exec('INSERT INTO schema_version (version) VALUES (1)');

      runMigrations(db);

      expect(getSchemaVersion(db)).toBe(SCHEMA_VERSION);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('reactions');
      expect(tableNames).toContain('conversations');
      expect(tableNames).toContain('topics');
      expect(tableNames).toContain('user_context');
    });

    it('should migrate from version 3 to latest', () => {
      db.exec('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)');
      db.exec('INSERT INTO schema_version (version) VALUES (3)');

      runMigrations(db);

      expect(getSchemaVersion(db)).toBe(SCHEMA_VERSION);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('topics');
      expect(tableNames).toContain('user_context');
    });
  });

  describe('individual migration functions', () => {
    it('migrateToVersion2 should create reactions table', () => {
      migrateToVersion2(db);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      expect(tables.map((t) => t.name)).toContain('reactions');
    });

    it('migrateToVersion3 should create conversation tables', () => {
      migrateToVersion3(db);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('conversations');
      expect(names).toContain('conversation_entries');
      expect(names).toContain('conversation_memory');
    });

    it('migrateToVersion4 should create topics and follow-up tables', () => {
      migrateToVersion4(db);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('topics');
      expect(names).toContain('entry_topics');
      expect(names).toContain('trend_summaries');
      expect(names).toContain('follow_ups');
    });

    it('migrateToVersion5 should create user_context table', () => {
      migrateToVersion5(db);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      expect(tables.map((t) => t.name)).toContain('user_context');
    });
  });
});
