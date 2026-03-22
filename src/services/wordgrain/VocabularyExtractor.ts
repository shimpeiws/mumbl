/**
 * Extract vocabulary from wordgrain files
 */
import type { Grain, GrainPos, VocabularySet, VocabularyWord, WordgrainFile } from './types.js';

interface WordMeta {
  pos?: GrainPos;
  frequency?: number;
  sentiment?: string;
  sentimentScore?: number;
  tfidf?: number;
  collocations?: string[];
  categories?: string[];
  isSlang?: boolean;
}

function processGrain(
  grain: Grain,
  wordSet: Set<string>,
  phraseSet: Set<string>,
  tagSet: Set<string>,
  wordMetaMap: Map<string, WordMeta>,
): void {
  const trimmed = grain.word.trim();
  if (!trimmed) return;

  if (trimmed.includes(' ')) {
    phraseSet.add(trimmed);
  } else {
    wordSet.add(trimmed);

    const existing = wordMetaMap.get(trimmed);
    if (existing) {
      if (grain.pos && !existing.pos) {
        existing.pos = grain.pos;
      }
      if (grain.frequency !== undefined) {
        existing.frequency = Math.max(existing.frequency ?? 0, grain.frequency);
      }
      if (grain.sentiment && !existing.sentiment) {
        existing.sentiment = grain.sentiment;
      }
      if (grain.sentiment_score !== undefined && existing.sentimentScore === undefined) {
        existing.sentimentScore = grain.sentiment_score;
      }
      if (grain.tfidf !== undefined) {
        existing.tfidf = Math.max(existing.tfidf ?? 0, grain.tfidf);
      }
      if (grain.collocations) {
        const merged = new Set(existing.collocations ?? []);
        for (const c of grain.collocations) merged.add(c);
        existing.collocations = [...merged];
      }
      if (grain.categories) {
        const merged = new Set(existing.categories ?? []);
        for (const c of grain.categories) merged.add(c);
        existing.categories = [...merged];
      }
      if (grain.is_slang === true) {
        existing.isSlang = true;
      }
    } else {
      wordMetaMap.set(trimmed, {
        pos: grain.pos,
        frequency: grain.frequency,
        sentiment: grain.sentiment,
        sentimentScore: grain.sentiment_score,
        tfidf: grain.tfidf,
        collocations: grain.collocations ? [...grain.collocations] : undefined,
        categories: grain.categories ? [...grain.categories] : undefined,
        isSlang: grain.is_slang,
      });
    }
  }

  if (grain.tags) {
    for (const tag of grain.tags) {
      const trimmedTag = tag.trim();
      if (trimmedTag) {
        tagSet.add(trimmedTag);
      }
    }
  }
}

function buildRichWords(
  sortedWords: string[],
  wordMetaMap: Map<string, WordMeta>,
): VocabularyWord[] {
  return sortedWords.map((word) => {
    const meta = wordMetaMap.get(word);
    const entry: VocabularyWord = { word };
    if (meta?.pos) entry.pos = meta.pos;
    if (meta?.frequency !== undefined) entry.frequency = meta.frequency;
    if (meta?.sentiment) entry.sentiment = meta.sentiment;
    if (meta?.sentimentScore !== undefined) entry.sentimentScore = meta.sentimentScore;
    if (meta?.tfidf !== undefined) entry.tfidf = meta.tfidf;
    if (meta?.collocations && meta.collocations.length > 0) entry.collocations = meta.collocations;
    if (meta?.categories && meta.categories.length > 0) entry.categories = meta.categories;
    if (meta?.isSlang === true) entry.isSlang = true;
    return entry;
  });
}

/**
 * Extract a deduplicated, sorted VocabularySet from a wordgrain file
 * @param file - Parsed WordgrainFile object
 * @returns Vocabulary set
 */
export function extractVocabulary(file: WordgrainFile): VocabularySet {
  const wordSet = new Set<string>();
  const phraseSet = new Set<string>();
  const tagSet = new Set<string>();
  const wordMetaMap = new Map<string, WordMeta>();

  for (const grain of file.grains) {
    processGrain(grain, wordSet, phraseSet, tagSet, wordMetaMap);
  }

  const sortedWords = [...wordSet].sort();

  return {
    words: sortedWords,
    phrases: [...phraseSet].sort(),
    tags: [...tagSet].sort(),
    source: file.name,
    richWords: buildRichWords(sortedWords, wordMetaMap),
    bars: file.bars,
  };
}
