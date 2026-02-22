import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeDatabase } from '../../src/infrastructure/database/client.js';
import { createEntryService } from '../../src/services/entry-service.js';

describe('Storage Concurrent Access', () => {
  let testDbPath: string;
  let testDir: string;

  beforeEach(() => {
    // Create temporary directory for test database
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mumbl-test-'));
    testDbPath = path.join(testDir, 'test.db');
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // WAL files may not exist if checkpointed
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`); // WAL shared memory
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`); // WAL write-ahead log
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  describe('Multiple Database Instances', () => {
    it('should allow multiple readers simultaneously', () => {
      // Create database and add test data
      const db1 = initializeDatabase(testDbPath);
      const service1 = createEntryService(db1);

      service1.create({ content: 'Entry 1' });
      service1.create({ content: 'Entry 2' });
      db1.close();

      // Open multiple read connections
      const db2 = new Database(testDbPath, { readonly: true });
      const db3 = new Database(testDbPath, { readonly: true });
      const db4 = new Database(testDbPath, { readonly: true });

      const service2 = createEntryService(db2);
      const service3 = createEntryService(db3);
      const service4 = createEntryService(db4);

      // All should read successfully
      const entries2 = service2.list();
      const entries3 = service3.list();
      const entries4 = service4.list();

      expect(entries2).toHaveLength(2);
      expect(entries3).toHaveLength(2);
      expect(entries4).toHaveLength(2);

      db2.close();
      db3.close();
      db4.close();
    });

    it('should handle concurrent writes without data loss', () => {
      const db1 = initializeDatabase(testDbPath);
      const db2 = new Database(testDbPath);
      const db3 = new Database(testDbPath);

      // Enable WAL mode for all connections
      db2.pragma('journal_mode = WAL');
      db2.pragma('busy_timeout = 5000');
      db3.pragma('journal_mode = WAL');
      db3.pragma('busy_timeout = 5000');

      const service1 = createEntryService(db1);
      const service2 = createEntryService(db2);
      const service3 = createEntryService(db3);

      // Write from multiple connections
      service1.create({ content: 'Entry from DB1' });
      service2.create({ content: 'Entry from DB2' });
      service3.create({ content: 'Entry from DB3' });

      // Verify all writes succeeded
      const entries1 = service1.list();
      const entries2 = service2.list();
      const entries3 = service3.list();

      expect(entries1).toHaveLength(3);
      expect(entries2).toHaveLength(3);
      expect(entries3).toHaveLength(3);

      db1.close();
      db2.close();
      db3.close();
    });

    it('should allow reads during writes (WAL mode)', () => {
      const db1 = initializeDatabase(testDbPath);
      const db2 = new Database(testDbPath, { readonly: true });

      const service1 = createEntryService(db1);
      const service2 = createEntryService(db2);

      // Add initial data
      service1.create({ content: 'Initial entry' });

      // Read while write connection is open
      const entries = service2.list();
      expect(entries).toHaveLength(1);

      // Write more data
      service1.create({ content: 'Second entry' });

      // Read again
      const updatedEntries = service2.list();
      expect(updatedEntries).toHaveLength(2);

      db1.close();
      db2.close();
    });
  });

  describe('CRUD Operations Across Connections', () => {
    it('should see changes made by other connections', () => {
      const db1 = initializeDatabase(testDbPath);
      const service1 = createEntryService(db1);

      const entry = service1.create({ content: 'Test entry' });
      db1.close();

      // Open new connection
      const db2 = new Database(testDbPath);
      const service2 = createEntryService(db2);

      // Should see the entry created by first connection
      const retrieved = service2.getById(entry.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.content).toBe('Test entry');

      db2.close();
    });

    it('should handle updates from different connections', () => {
      const db1 = initializeDatabase(testDbPath);
      const service1 = createEntryService(db1);

      const entry = service1.create({ content: 'Original' });
      db1.close();

      // Update from different connection
      const db2 = new Database(testDbPath);
      const service2 = createEntryService(db2);

      service2.update(entry.id, { content: 'Updated' });
      db2.close();

      // Verify update from third connection
      const db3 = new Database(testDbPath);
      const service3 = createEntryService(db3);

      const retrieved = service3.getById(entry.id);
      expect(retrieved?.content).toBe('Updated');

      db3.close();
    });
  });

  describe('Performance Under Concurrent Load', () => {
    it('should handle 10 concurrent writes efficiently', () => {
      const db = initializeDatabase(testDbPath);
      const service = createEntryService(db);

      // Create 10 entries concurrently (simulated with synchronous calls)
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        service.create({ content: `Entry ${i}` });
      }

      const duration = Date.now() - startTime;

      expect(service.count()).toBe(10);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second

      db.close();
    });

    it('should handle large dataset reads efficiently', () => {
      const db = initializeDatabase(testDbPath);
      const service = createEntryService(db);

      // Create 100 entries
      for (let i = 0; i < 100; i++) {
        service.create({ content: `Entry ${i}` });
      }

      // Measure list performance
      const startTime = Date.now();
      const entries = service.list();
      const duration = Date.now() - startTime;

      expect(entries).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should read in < 100ms

      db.close();
    });
  });

  describe('WAL Checkpoint', () => {
    it('should successfully checkpoint WAL file', () => {
      const db = initializeDatabase(testDbPath);
      const service = createEntryService(db);

      // Create some entries
      for (let i = 0; i < 10; i++) {
        service.create({ content: `Entry ${i}` });
      }

      // Perform checkpoint
      const result = db.pragma('wal_checkpoint(PASSIVE)', {
        simple: true,
      }) as number;

      // Checkpoint should succeed (returns 0 or 1)
      expect([0, 1]).toContain(result);

      db.close();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from connection close during operation', () => {
      const db1 = initializeDatabase(testDbPath);
      const service1 = createEntryService(db1);

      service1.create({ content: 'Entry 1' });

      // Close connection abruptly
      db1.close();

      // Open new connection and verify data integrity
      const db2 = new Database(testDbPath);
      const service2 = createEntryService(db2);

      const entries = service2.list();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.content).toBe('Entry 1');

      db2.close();
    });
  });
});
