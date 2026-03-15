import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseError } from '../errors/DomainErrors.js';
import {
  DEFAULT_DB_FILE,
  DEFAULT_STORAGE_DIR,
  closeDatabase,
  ensureStorageDir,
  getDatabasePath,
  initializeDatabase,
} from './client.js';

describe('database client', () => {
  const tmpDirs: string[] = [];

  function createTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mumbl-test-'));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    closeDatabase();
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  describe('constants', () => {
    it('should have correct default storage dir', () => {
      expect(DEFAULT_STORAGE_DIR).toBe(path.join(os.homedir(), '.mumbl'));
    });

    it('should have correct default db file', () => {
      expect(DEFAULT_DB_FILE).toBe('mumbl.db');
    });
  });

  describe('getDatabasePath', () => {
    it('should return default path when no args', () => {
      expect(getDatabasePath()).toBe(path.join(DEFAULT_STORAGE_DIR, DEFAULT_DB_FILE));
    });

    it('should use custom dir and file', () => {
      expect(getDatabasePath('/custom/dir', 'test.db')).toBe('/custom/dir/test.db');
    });
  });

  describe('ensureStorageDir', () => {
    it('should create directory if it does not exist', () => {
      const dir = path.join(createTmpDir(), 'subdir');
      expect(fs.existsSync(dir)).toBe(false);

      ensureStorageDir(dir);
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      const dir = createTmpDir();
      expect(() => ensureStorageDir(dir)).not.toThrow();
    });
  });

  describe('initializeDatabase', () => {
    it('should create a database with WAL mode', () => {
      const dir = createTmpDir();
      const dbPath = path.join(dir, 'test.db');
      const db = initializeDatabase(dbPath);

      const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
      expect(result[0]?.journal_mode).toBe('wal');
      db.close();
    });

    it('should create schema tables', () => {
      const dir = createTmpDir();
      const dbPath = path.join(dir, 'test.db');
      const db = initializeDatabase(dbPath);

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('entries');
      expect(names).toContain('schema_version');
      db.close();
    });

    it('should set foreign keys on', () => {
      const dir = createTmpDir();
      const dbPath = path.join(dir, 'test.db');
      const db = initializeDatabase(dbPath);

      const result = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
      expect(result[0]?.foreign_keys).toBe(1);
      db.close();
    });

    it('should throw DatabaseError on invalid path', () => {
      expect(() => initializeDatabase('/nonexistent/path/that/cannot/exist/test.db')).toThrow(
        DatabaseError,
      );
    });
  });
});
