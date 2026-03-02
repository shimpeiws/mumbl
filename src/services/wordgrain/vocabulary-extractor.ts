/**
 * Extract vocabulary from wordgrain files
 */
import type { Grain, GrainPos, VocabularySet, VocabularyWord, WordgrainFile } from './types.js';

interface WordMeta {
  pos?: GrainPos;
  frequency?: number;
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
    } else {
      wordMetaMap.set(trimmed, {
        pos: grain.pos,
        frequency: grain.frequency,
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
    return entry;
  });
}

/**
 * Extract a deduplicated, sorted VocabularySet from wordgrain files
 * @param files - Array of parsed WordgrainFile objects
 * @returns Consolidated vocabulary set
 */
export function extractVocabulary(files: WordgrainFile[]): VocabularySet {
  const wordSet = new Set<string>();
  const phraseSet = new Set<string>();
  const tagSet = new Set<string>();
  const sources: string[] = [];
  const wordMetaMap = new Map<string, WordMeta>();

  for (const file of files) {
    sources.push(file.name);
    for (const grain of file.grains) {
      processGrain(grain, wordSet, phraseSet, tagSet, wordMetaMap);
    }
  }

  const sortedWords = [...wordSet].sort();

  return {
    words: sortedWords,
    phrases: [...phraseSet].sort(),
    tags: [...tagSet].sort(),
    source: sources.join(', '),
    richWords: buildRichWords(sortedWords, wordMetaMap),
  };
}
