/**
 * Bar quote reaction: returns bar text directly as a reaction
 * without going through the LLM, when keyword matching succeeds.
 */

import { isDuplicate } from '../ReactionService.js';
import type { DetectedLanguage } from '../language/types.js';
import type { BarSource } from '../wordgrain/types.js';
import type { BarIndex } from './BarIndex.js';

export interface BarQuoteResult {
  text: string;
  source?: BarSource;
}

/**
 * Attempt to find a matching bar quote for the given entry text.
 *
 * Returns null if no match, probability gate rejects, or all matches are duplicates.
 * The probability gate skips ~40% of the time to keep bar quotes feeling organic.
 */
export function tryBarQuote(
  entryText: string,
  barIndex: BarIndex,
  recentReactions: string[],
  language?: DetectedLanguage,
  random?: () => number,
): BarQuoteResult | null {
  const matches = barIndex.lookup(entryText, language);
  if (matches.length === 0) return null;

  // Probability gate: skip ~40% of the time
  if ((random ?? Math.random)() > 0.6) return null;

  for (const bar of matches) {
    if (!isDuplicate(bar.text, recentReactions)) {
      return { text: bar.text, source: bar.source };
    }
  }

  return null;
}
