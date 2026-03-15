import { describe, expect, it } from 'vitest';
import { generateEntryId, isValidEntryId } from './IdService.js';

describe('id-service', () => {
  describe('generateEntryId', () => {
    it('should generate a UUID v4', () => {
      const id = generateEntryId();
      expect(isValidEntryId(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = Array.from({ length: 1000 }, () => generateEntryId());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1000);
    });
  });

  describe('isValidEntryId', () => {
    it('should validate correct UUID v4', () => {
      expect(isValidEntryId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(isValidEntryId('not-a-uuid')).toBe(false);
      expect(isValidEntryId('550e8400-e29b-51d4-a716-446655440000')).toBe(false); // v5, not v4
      expect(isValidEntryId('')).toBe(false);
    });
  });
});
