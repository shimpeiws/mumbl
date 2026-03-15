import { describe, expect, it } from 'vitest';
import type { Bar } from '../wordgrain/types.js';
import type { BarIndex } from './bar-index.js';
import { tryBarQuote } from './bar-quote.js';

function createMockIndex(bars: Bar[]): BarIndex {
  return {
    lookup: () => bars,
  };
}

describe('tryBarQuote', () => {
  it('should return null when no matches found', () => {
    const index = createMockIndex([]);
    const result = tryBarQuote('test entry', index, [], 'en', () => 0.3);
    expect(result).toBeNull();
  });

  it('should return a matching bar when probability passes', () => {
    const bar: Bar = { text: 'hustle hard every day', source: { artist: 'Test' } };
    const index = createMockIndex([bar]);
    const result = tryBarQuote('test', index, [], 'en', () => 0.3);
    expect(result).not.toBeNull();
    expect(result?.text).toBe('hustle hard every day');
    expect(result?.source?.artist).toBe('Test');
  });

  it('should return null when probability gate rejects (random > 0.6)', () => {
    const bar: Bar = { text: 'hustle hard every day' };
    const index = createMockIndex([bar]);
    const result = tryBarQuote('test', index, [], 'en', () => 0.7);
    expect(result).toBeNull();
  });

  it('should return null at exactly 0.6 boundary (> 0.6 is reject)', () => {
    const bar: Bar = { text: 'hustle hard every day' };
    const index = createMockIndex([bar]);
    // 0.6 is NOT > 0.6, so it should pass
    const result = tryBarQuote('test', index, [], 'en', () => 0.6);
    expect(result).not.toBeNull();
  });

  it('should skip duplicate bars and return first non-duplicate', () => {
    const bars: Bar[] = [{ text: 'already seen this' }, { text: 'fresh new bar' }];
    const index = createMockIndex(bars);
    const result = tryBarQuote('test', index, ['already seen this'], 'en', () => 0.3);
    expect(result?.text).toBe('fresh new bar');
  });

  it('should return null when all matches are duplicates', () => {
    const bars: Bar[] = [{ text: 'seen one' }, { text: 'seen two' }];
    const index = createMockIndex(bars);
    const result = tryBarQuote('test', index, ['seen one', 'seen two'], 'en', () => 0.3);
    expect(result).toBeNull();
  });

  it('should work without explicit language parameter', () => {
    const bar: Bar = { text: 'hustle hard every day' };
    const index = createMockIndex([bar]);
    const result = tryBarQuote('test', index, [], undefined, () => 0.3);
    expect(result).not.toBeNull();
  });

  it('should return bar without source when source is undefined', () => {
    const bar: Bar = { text: 'no source bar' };
    const index = createMockIndex([bar]);
    const result = tryBarQuote('test', index, [], 'en', () => 0.3);
    expect(result?.text).toBe('no source bar');
    expect(result?.source).toBeUndefined();
  });
});
