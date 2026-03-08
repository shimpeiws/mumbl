/**
 * Context-aware bar selection for reaction prompts
 *
 * Scores bars by keyword overlap with the journal entry,
 * then selects a mix of relevant + random bars.
 */

import type { DetectedLanguage } from '../language/types.js';
import { isStopWord } from '../trends/stopwords.js';
import type { Bar } from '../wordgrain/types.js';

const MIN_TOKEN_LENGTH = 2;

/**
 * Normalize text for token matching (duplicated from topic-extractor to avoid coupling)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Split text into tokens (duplicated from topic-extractor to avoid coupling)
 */
function tokenize(text: string): string[] {
  return text
    .split(/[\s,.!?;:'"()\[\]{}\-_/\\|@#$%^&*+=<>~`]+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

/**
 * Build a set of meaningful tokens from text, excluding stopwords.
 */
export function buildEntryTokens(text: string): Set<string> {
  const normalized = normalizeText(text);
  const tokens = tokenize(normalized);
  const result = new Set<string>();
  for (const token of tokens) {
    if (!isStopWord(token)) {
      result.add(token);
    }
  }
  return result;
}

/**
 * Score a bar's relevance to the entry by non-stopword token overlap.
 * Adds +0.5 bonus if bar.language matches the detected language.
 */
export function scoreBarRelevance(
  bar: Bar,
  entryTokens: Set<string>,
  language?: DetectedLanguage,
): number {
  if (entryTokens.size === 0) return 0;

  const barText = normalizeText(bar.text);
  const barTokens = tokenize(barText);

  let score = 0;
  for (const token of barTokens) {
    if (!isStopWord(token) && entryTokens.has(token)) {
      score += 1;
    }
  }

  if (language && bar.language && bar.language === language) {
    score += 0.5;
  }

  return score;
}

/**
 * Shuffle an array in-place using Fisher-Yates algorithm.
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Select bars for reaction prompts using a mix of relevant + random bars.
 *
 * - Tokenizes entry text, removes stopwords
 * - Scores all bars by keyword overlap
 * - Picks top `relevantCount` bars with score > 0
 * - Fills remaining slots with random bars from unselected pool
 * - Shuffles final selection to avoid positional bias
 * - Falls back to all-random when no bars match keywords
 */
export function selectBarsForReaction(
  bars: Bar[],
  entryText: string,
  maxCount = 5,
  relevantCount = 3,
  language?: DetectedLanguage,
): Bar[] {
  if (bars.length === 0) return [];
  if (bars.length <= maxCount) return shuffleArray([...bars]);

  const entryTokens = buildEntryTokens(entryText);

  // Score all bars
  const scored = bars.map((bar) => ({
    bar,
    score: scoreBarRelevance(bar, entryTokens, language),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const selected: Bar[] = [];
  const selectedSet = new Set<number>();

  // Pick top relevant bars (score > 0)
  for (let i = 0; i < scored.length && selected.length < relevantCount; i++) {
    const item = scored[i];
    if (item && item.score > 0) {
      selected.push(item.bar);
      selectedSet.add(i);
    }
  }

  // Fill remaining with random bars from unselected pool
  const remaining = scored
    .map((item, idx) => ({ item, idx }))
    .filter(({ idx }) => !selectedSet.has(idx));

  const shuffledRemaining = shuffleArray(remaining);
  const slotsLeft = maxCount - selected.length;
  for (let i = 0; i < slotsLeft && i < shuffledRemaining.length; i++) {
    const entry = shuffledRemaining[i];
    if (entry) {
      selected.push(entry.item.bar);
    }
  }

  // Shuffle final selection to avoid positional bias
  return shuffleArray(selected);
}
