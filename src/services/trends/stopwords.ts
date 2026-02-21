/**
 * Stopword detection using the stopwords-iso library
 * Provides comprehensive stopword lists for English and Japanese
 */

import stopwordsIso from 'stopwords-iso';

const enWords = stopwordsIso['en'] ?? [];
const jaWords = stopwordsIso['ja'] ?? [];

const STOP_WORDS: ReadonlySet<string> = new Set([...enWords, ...jaWords]);

/**
 * Check if a token is a stop word (English or Japanese)
 */
export function isStopWord(token: string): boolean {
  return STOP_WORDS.has(token);
}

/**
 * Get the full set of stop words for testing/introspection
 */
export function getStopWords(): ReadonlySet<string> {
  return STOP_WORDS;
}
