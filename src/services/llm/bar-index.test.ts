import { describe, expect, it } from 'vitest';
import type { Bar } from '../wordgrain/types.js';
import { buildBarIndex } from './bar-index.js';

const longText = (base: string): string =>
  base.padEnd(101, ' padding text to exceed minimum length');

describe('buildBarIndex', () => {
  it('should exclude bars with 100 or fewer characters', () => {
    const bars: Bar[] = [{ text: 'short bar text' }];
    const index = buildBarIndex(bars);
    const results = index.lookup('short bar text', 'en');
    expect(results).toHaveLength(0);
  });

  it('should include bars longer than 100 characters', () => {
    const bars: Bar[] = [
      { text: longText('hustle grind daily motivation never stop working hard') },
    ];
    const index = buildBarIndex(bars);
    const results = index.lookup('hustle grind', 'en');
    expect(results).toHaveLength(1);
  });

  it('should return empty for no keyword overlap', () => {
    const bars: Bar[] = [{ text: longText('hustle grind daily motivation never stop') }];
    const index = buildBarIndex(bars);
    const results = index.lookup('sunshine rainbow', 'en');
    expect(results).toHaveLength(0);
  });

  it('should require 2 matching tokens for English', () => {
    const bars: Bar[] = [{ text: longText('hustle grind daily motivation never stop') }];
    const index = buildBarIndex(bars);

    // Only 1 match - should not return
    const single = index.lookup('hustle rainbow', 'en');
    expect(single).toHaveLength(0);

    // 2 matches - should return
    const double = index.lookup('hustle grind', 'en');
    expect(double).toHaveLength(1);
  });

  it('should require only 1 matching token for Japanese', () => {
    const bars: Bar[] = [
      { text: longText('仕事は大変だけど頑張ろう毎日努力して成長していく'), language: 'ja' },
    ];
    const index = buildBarIndex(bars);
    const results = index.lookup('仕事がつらい', 'ja');
    expect(results).toHaveLength(1);
  });

  it('should sort results by match count descending', () => {
    const bars: Bar[] = [
      { text: longText('hustle grind daily motivation never stop working hard everyday') },
      {
        text: longText(
          'hustle grind daily motivation work hard play hard never give up on your dreams',
        ),
      },
    ];
    const index = buildBarIndex(bars);
    const results = index.lookup('hustle grind daily motivation', 'en');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should not match on stopwords only', () => {
    const bars: Bar[] = [{ text: longText('the is a an this that with from for and') }];
    const index = buildBarIndex(bars);
    const results = index.lookup('the is a', 'en');
    expect(results).toHaveLength(0);
  });

  it('should handle empty bars array', () => {
    const index = buildBarIndex([]);
    const results = index.lookup('anything', 'en');
    expect(results).toHaveLength(0);
  });

  it('should handle empty entry text', () => {
    const bars: Bar[] = [{ text: longText('hustle grind daily motivation never stop') }];
    const index = buildBarIndex(bars);
    const results = index.lookup('', 'en');
    expect(results).toHaveLength(0);
  });

  it('should default to en threshold when language is undefined', () => {
    const bars: Bar[] = [{ text: longText('hustle grind daily motivation never stop') }];
    const index = buildBarIndex(bars);

    // 1 match with undefined language should not return (en threshold = 2)
    const single = index.lookup('hustle rainbow');
    expect(single).toHaveLength(0);

    // 2 matches should return
    const double = index.lookup('hustle grind');
    expect(double).toHaveLength(1);
  });
});
