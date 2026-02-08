import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../../../repositories/types.js';
import { PermissionLevel } from './context-protocol.js';
import { PermissionManager } from './permission-manager.js';

describe('PermissionManager', () => {
  const manager = new PermissionManager();

  const createEntry = (content: string, metadata = {}): JournalEntry => ({
    id: 'test-id',
    timestamp: new Date('2025-01-15T10:00:00Z'),
    content,
    metadata,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  });

  describe('getEntryPermission', () => {
    it('should return permission level from metadata if set', () => {
      const entry = createEntry('content', { permissionLevel: 'public' });
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Public);
    });

    it('should recognize sensitive metadata flag', () => {
      const entry = createEntry('content', { sensitive: true });
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should recognize private metadata flag', () => {
      const entry = createEntry('content', { private: true });
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect SSN patterns as sensitive', () => {
      const entry = createEntry('My SSN is 123-45-6789');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect credit card patterns as sensitive', () => {
      const entry = createEntry('Card: 4111-1111-1111-1111');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect password patterns as sensitive', () => {
      const entry = createEntry('password: mysecretpass');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect API key patterns as sensitive', () => {
      const entry = createEntry('api_key=sk-1234567890');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect [private] marker as sensitive', () => {
      const entry = createEntry('[private] This is my secret thought');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect [sensitive] marker as sensitive', () => {
      const entry = createEntry('[sensitive] Health information');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should detect email addresses as sensitive', () => {
      const entry = createEntry('Contact me at john@example.com');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Sensitive);
    });

    it('should default to private for normal content', () => {
      const entry = createEntry('Just a normal journal entry about my day');
      expect(manager.getEntryPermission(entry)).toBe(PermissionLevel.Private);
    });
  });

  describe('filterByPermission', () => {
    it('should filter entries by maximum permission level', () => {
      const entries = [
        createEntry('public entry', { permissionLevel: 'public' }),
        createEntry('private entry', { permissionLevel: 'private' }),
        createEntry('sensitive entry', { permissionLevel: 'sensitive' }),
      ];

      const publicOnly = manager.filterByPermission(entries, PermissionLevel.Public);
      expect(publicOnly).toHaveLength(1);
      expect(publicOnly[0].content).toBe('public entry');

      const upToPrivate = manager.filterByPermission(entries, PermissionLevel.Private);
      expect(upToPrivate).toHaveLength(2);

      const all = manager.filterByPermission(entries, PermissionLevel.Sensitive);
      expect(all).toHaveLength(3);
    });

    it('should return empty array when no entries match', () => {
      const entries = [createEntry('sensitive', { permissionLevel: 'sensitive' })];
      const result = manager.filterByPermission(entries, PermissionLevel.Public);
      expect(result).toHaveLength(0);
    });
  });

  describe('redactSensitiveContent', () => {
    it('should redact SSN patterns', () => {
      const entry = createEntry('SSN: 123-45-6789');
      const redacted = manager.redactSensitiveContent(entry);
      expect(redacted.content).toBe('SSN: [REDACTED]');
      expect(redacted.metadata.wasRedacted).toBe(true);
    });

    it('should redact credit card patterns', () => {
      const entry = createEntry('Card: 4111111111111111');
      const redacted = manager.redactSensitiveContent(entry);
      expect(redacted.content).toBe('Card: [REDACTED]');
    });

    it('should redact password patterns', () => {
      const entry = createEntry('password=secret123');
      const redacted = manager.redactSensitiveContent(entry);
      expect(redacted.content).toBe('[REDACTED]');
    });

    it('should redact multiple sensitive patterns', () => {
      const entry = createEntry('SSN: 123-45-6789, email: test@example.com');
      const redacted = manager.redactSensitiveContent(entry);
      expect(redacted.content).toBe('SSN: [REDACTED], email: [REDACTED]');
    });

    it('should not modify content without sensitive patterns', () => {
      const entry = createEntry('Normal content without secrets');
      const redacted = manager.redactSensitiveContent(entry);
      expect(redacted.content).toBe('Normal content without secrets');
      expect(redacted.metadata.wasRedacted).toBe(false);
    });

    it('should not modify original entry', () => {
      const entry = createEntry('SSN: 123-45-6789');
      const originalContent = entry.content;
      manager.redactSensitiveContent(entry);
      expect(entry.content).toBe(originalContent);
    });
  });

  describe('containsSensitiveContent', () => {
    it('should return true for sensitive patterns', () => {
      expect(manager.containsSensitiveContent('SSN: 123-45-6789')).toBe(true);
      expect(manager.containsSensitiveContent('password: secret')).toBe(true);
      expect(manager.containsSensitiveContent('api_key=abc123')).toBe(true);
      expect(manager.containsSensitiveContent('[private] content')).toBe(true);
    });

    it('should return false for normal content', () => {
      expect(manager.containsSensitiveContent('Just a normal entry')).toBe(false);
      expect(manager.containsSensitiveContent('Talking about my day')).toBe(false);
    });
  });

  describe('countExcludedEntries', () => {
    it('should count entries that would be excluded', () => {
      const entries = [
        createEntry('public', { permissionLevel: 'public' }),
        createEntry('private', { permissionLevel: 'private' }),
        createEntry('sensitive', { permissionLevel: 'sensitive' }),
      ];

      expect(manager.countExcludedEntries(entries, PermissionLevel.Public)).toBe(2);
      expect(manager.countExcludedEntries(entries, PermissionLevel.Private)).toBe(1);
      expect(manager.countExcludedEntries(entries, PermissionLevel.Sensitive)).toBe(0);
    });
  });
});
