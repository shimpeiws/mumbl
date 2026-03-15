/**
 * Inverted index for O(k) bar lookup by keyword matching.
 * Used by the bar quote feature to find bars that match journal entry text.
 */

import { tokenize } from '../../utils/tokenize.js';
import type { DetectedLanguage } from '../language/types.js';
import { isStopWord } from '../trends/stopwords.js';
import type { Bar } from '../wordgrain/types.js';
import { buildEntryTokens } from './BarSelector.js';

const MIN_BAR_LENGTH = 100;

export interface BarIndex {
  lookup(entryText: string, language?: DetectedLanguage): Bar[];
}

interface BarMatch {
  bar: Bar;
  count: number;
}

/**
 * Build an inverted index mapping non-stopword tokens to bars.
 * Bars shorter than MIN_BAR_LENGTH characters are excluded.
 */
export function buildBarIndex(bars: Bar[]): BarIndex {
  const index = new Map<string, Bar[]>();

  for (const bar of bars) {
    if (bar.text.length <= MIN_BAR_LENGTH) continue;

    const tokens = tokenize(bar.text.toLowerCase().trim());
    const seen = new Set<string>();

    for (const token of tokens) {
      if (isStopWord(token) || seen.has(token)) continue;
      seen.add(token);

      let list = index.get(token);
      if (!list) {
        list = [];
        index.set(token, list);
      }
      list.push(bar);
    }
  }

  return {
    lookup(entryText: string, language?: DetectedLanguage): Bar[] {
      const entryTokens = buildEntryTokens(entryText);
      if (entryTokens.size === 0) return [];

      const threshold = language === 'ja' ? 1 : 2;
      const matchCounts = new Map<Bar, number>();

      for (const token of entryTokens) {
        const bars = index.get(token);
        if (!bars) continue;
        for (const bar of bars) {
          matchCounts.set(bar, (matchCounts.get(bar) ?? 0) + 1);
        }
      }

      const matches: BarMatch[] = [];
      for (const [bar, count] of matchCounts) {
        if (count >= threshold) {
          matches.push({ bar, count });
        }
      }

      matches.sort((a, b) => b.count - a.count);
      return matches.map((m) => m.bar);
    },
  };
}
