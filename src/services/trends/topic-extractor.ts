/**
 * Topic extraction from entry content
 * Simple text processing without NLP libraries
 */

import { isStopWord } from './stopwords.js';

const MIN_WORD_LENGTH = 2;
const MAX_TOPICS = 10;

/**
 * Normalize text for consistent topic matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Split text into tokens (handles both English and Japanese)
 */
function tokenize(text: string): string[] {
  // Split on whitespace and common punctuation
  return text
    .split(/[\s,.!?;:'"()\[\]{}\-_/\\|@#$%^&*+=<>~`]+/)
    .filter((token) => token.length >= MIN_WORD_LENGTH);
}

/**
 * Extract meaningful single-word topics
 */
function extractUnigrams(tokens: string[]): string[] {
  return tokens.filter((token) => !isStopWord(token) && token.length >= MIN_WORD_LENGTH);
}

/**
 * Extract meaningful bigrams (two-word phrases)
 */
function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const first = tokens[i];
    const second = tokens[i + 1];
    if (first && second && !isStopWord(first) && !isStopWord(second)) {
      bigrams.push(`${first} ${second}`);
    }
  }
  return bigrams;
}

/**
 * Extract meaningful trigrams (three-word phrases)
 */
function extractTrigrams(tokens: string[]): string[] {
  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    const first = tokens[i];
    const second = tokens[i + 1];
    const third = tokens[i + 2];
    if (first && second && third) {
      // Allow one stop word in the middle of a trigram
      const nonStopCount = [first, second, third].filter((t) => !isStopWord(t)).length;
      if (nonStopCount >= 2) {
        trigrams.push(`${first} ${second} ${third}`);
      }
    }
  }
  return trigrams;
}

/**
 * Extract topics from entry content
 * Returns deduplicated, normalized topic strings
 */
export function extractTopics(content: string): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const normalized = normalizeText(content);
  const tokens = tokenize(normalized);

  if (tokens.length === 0) {
    return [];
  }

  const unigrams = extractUnigrams(tokens);
  const bigrams = extractBigrams(tokens);
  const trigrams = extractTrigrams(tokens);

  // Combine all topics and deduplicate
  const allTopics = [...trigrams, ...bigrams, ...unigrams];
  const seen = new Set<string>();
  const deduplicated: string[] = [];

  for (const topic of allTopics) {
    if (!seen.has(topic)) {
      seen.add(topic);
      deduplicated.push(topic);
    }
  }

  // Return top topics (longer phrases first, already ordered by trigrams > bigrams > unigrams)
  return deduplicated.slice(0, MAX_TOPICS);
}
