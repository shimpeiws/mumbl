import { describe, expect, it } from 'vitest';
import type { Bar } from '../wordgrain/types.js';
import { buildEntryTokens, scoreBarRelevance, selectBarsForReaction } from './bar-selector.js';

describe('buildEntryTokens', () => {
  it('should return non-stopword tokens as a set', () => {
    const tokens = buildEntryTokens('project deadline tough meeting');
    expect(tokens.has('project')).toBe(true);
    expect(tokens.has('deadline')).toBe(true);
    expect(tokens.has('tough')).toBe(true);
    expect(tokens.has('meeting')).toBe(true);
    // "is" is a stopword
    const tokens2 = buildEntryTokens('is the a');
    expect(tokens2.has('is')).toBe(false);
  });

  it('should return empty set for empty text', () => {
    const tokens = buildEntryTokens('');
    expect(tokens.size).toBe(0);
  });

  it('should normalize to lowercase', () => {
    const tokens = buildEntryTokens('PROJECT Tough');
    expect(tokens.has('project')).toBe(true);
    expect(tokens.has('tough')).toBe(true);
  });
});

describe('scoreBarRelevance', () => {
  it('should return 0 with no keyword overlap', () => {
    const bar: Bar = { text: 'sunshine and rainbows' };
    const entryTokens = buildEntryTokens('project deadline tough');
    expect(scoreBarRelevance(bar, entryTokens)).toBe(0);
  });

  it('should return positive score with overlap', () => {
    const bar: Bar = { text: 'tough times never last' };
    const entryTokens = buildEntryTokens('project is tough');
    const score = scoreBarRelevance(bar, entryTokens);
    expect(score).toBeGreaterThan(0);
  });

  it('should add language match bonus', () => {
    const bar: Bar = { text: 'tough times', language: 'en' };
    const entryTokens = buildEntryTokens('tough day');
    const scoreWithLang = scoreBarRelevance(bar, entryTokens, 'en');
    const scoreWithoutLang = scoreBarRelevance(bar, entryTokens);
    expect(scoreWithLang).toBe(scoreWithoutLang + 0.5);
  });

  it('should not add bonus when languages differ', () => {
    const bar: Bar = { text: 'tough times', language: 'ja' };
    const entryTokens = buildEntryTokens('tough day');
    const score = scoreBarRelevance(bar, entryTokens, 'en');
    // No bonus added, just keyword overlap
    const scoreNoLang = scoreBarRelevance(bar, entryTokens);
    expect(score).toBe(scoreNoLang);
  });

  it('should ignore stopwords in bar text', () => {
    const bar: Bar = { text: 'the is a an' };
    const entryTokens = new Set(['the', 'is']);
    // These are all stopwords, so no non-stopword overlap
    expect(scoreBarRelevance(bar, entryTokens)).toBe(0);
  });

  it('should return 0 for empty entry tokens', () => {
    const bar: Bar = { text: 'tough times' };
    const entryTokens = new Set<string>();
    expect(scoreBarRelevance(bar, entryTokens)).toBe(0);
  });

  it('should handle empty bar text', () => {
    const bar: Bar = { text: '' };
    const entryTokens = buildEntryTokens('work tough');
    expect(scoreBarRelevance(bar, entryTokens)).toBe(0);
  });
});

describe('selectBarsForReaction', () => {
  const makeBars = (count: number): Bar[] =>
    Array.from({ length: count }, (_, i) => ({ text: `bar ${i} unique${i}` }));

  it('should return empty array for empty bars', () => {
    expect(selectBarsForReaction([], 'test')).toEqual([]);
  });

  it('should return all bars when count <= maxCount', () => {
    const bars = makeBars(3);
    const result = selectBarsForReaction(bars, 'test', 5);
    expect(result).toHaveLength(3);
    for (const bar of bars) {
      expect(result.map((r) => r.text)).toContain(bar.text);
    }
  });

  it('should prefer keyword-matching bars', () => {
    const bars: Bar[] = [
      { text: 'sunshine rainbow' },
      { text: 'hustle grind daily' },
      { text: 'love peace harmony' },
      { text: 'tough hustle grind' },
      { text: 'moon stars night' },
      { text: 'grind never stops' },
      { text: 'random filler xyz' },
      { text: 'another filler bar' },
    ];
    // Run multiple times to account for randomness in random slots
    const relevantTexts = ['hustle grind daily', 'tough hustle grind', 'grind never stops'];
    let relevantCount = 0;
    const runs = 20;
    for (let i = 0; i < runs; i++) {
      const result = selectBarsForReaction(bars, 'tough hustle grind continues', 5, 3);
      expect(result).toHaveLength(5);
      for (const r of result) {
        if (relevantTexts.includes(r.text)) relevantCount++;
      }
    }
    // On average, all 3 relevant bars should appear most of the time
    expect(relevantCount / runs).toBeGreaterThan(2);
  });

  it('should fill remaining slots with random bars', () => {
    const bars: Bar[] = [
      { text: 'match hustle' },
      { text: 'random one' },
      { text: 'random two' },
      { text: 'random three' },
      { text: 'random four' },
      { text: 'random five' },
      { text: 'random six' },
    ];
    const result = selectBarsForReaction(bars, 'hustle grind', 5, 3);
    expect(result).toHaveLength(5);
  });

  it('should fall back to all-random when no bars match', () => {
    const bars = makeBars(10);
    const result = selectBarsForReaction(bars, 'completely unrelated xyz', 5, 3);
    expect(result).toHaveLength(5);
  });

  it('should fall back to all-random when entry text is empty', () => {
    const bars = makeBars(10);
    const result = selectBarsForReaction(bars, '', 5, 3);
    expect(result).toHaveLength(5);
  });

  it('should respect maxCount', () => {
    const bars = makeBars(20);
    const result = selectBarsForReaction(bars, 'test', 3);
    expect(result).toHaveLength(3);
  });

  it('should produce no duplicates', () => {
    const bars = makeBars(20);
    const result = selectBarsForReaction(bars, 'bar unique5', 5, 3);
    const texts = result.map((r) => r.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('should respect relevantCount parameter', () => {
    const bars: Bar[] = [
      { text: 'hustle hard' },
      { text: 'hustle grind' },
      { text: 'hustle daily' },
      { text: 'hustle flow' },
      { text: 'random one' },
      { text: 'random two' },
      { text: 'random three' },
    ];
    // With relevantCount=2, at most 2 relevant bars should be prioritized
    const result = selectBarsForReaction(bars, 'hustle hard every day', 5, 2);
    expect(result).toHaveLength(5);
  });

  it('should never exceed maxCount', () => {
    const bars: Bar[] = Array.from({ length: 50 }, (_, i) => ({
      text: `hustle grind ${i}`,
    }));
    const result = selectBarsForReaction(bars, 'hustle grind', 5, 3);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
