import type { DetectedLanguage } from './types.js';

/**
 * Regex matching CJK characters commonly used in Japanese text:
 * - CJK Unified Ideographs (U+4E00-U+9FFF)
 * - Hiragana (U+3040-U+309F)
 * - Katakana (U+30A0-U+30FF)
 */
const CJK_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g;

/**
 * Detect the language of a given text.
 * Returns 'ja' if CJK characters make up more than 10% of the text,
 * otherwise returns 'en'.
 */
export function detectLanguage(text: string): DetectedLanguage {
  const stripped = text.replace(/\s/g, '');
  if (stripped.length === 0) {
    return 'en';
  }

  const cjkMatches = stripped.match(CJK_PATTERN);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  const ratio = cjkCount / stripped.length;

  return ratio > 0.1 ? 'ja' : 'en';
}
