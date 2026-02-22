import { describe, expect, it } from 'vitest';
import { toUnixSeconds } from './date.js';

describe('toUnixSeconds', () => {
  it('should convert a Date to Unix timestamp in seconds', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(toUnixSeconds(date)).toBe(1704067200);
  });

  it('should floor fractional seconds', () => {
    const date = new Date('2024-01-01T00:00:00.999Z');
    expect(toUnixSeconds(date)).toBe(1704067200);
  });

  it('should handle epoch correctly', () => {
    const date = new Date(0);
    expect(toUnixSeconds(date)).toBe(0);
  });
});
