/**
 * Extract vocabulary from wordgrain files
 */
import type { GrainPos, VocabularySet, VocabularyWord, WordgrainFile } from './types.js';

interface WordMeta {
  pos?: GrainPos;
  frequency?: number;
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
      const trimmed = grain.word.trim();
      if (!trimmed) continue;

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
  }

  const sortedWords = [...wordSet].sort();

  const richWords: VocabularyWord[] = sortedWords.map((word) => {
    const meta = wordMetaMap.get(word);
    const entry: VocabularyWord = { word };
    if (meta?.pos) entry.pos = meta.pos;
    if (meta?.frequency !== undefined) entry.frequency = meta.frequency;
    return entry;
  });

  return {
    words: sortedWords,
    phrases: [...phraseSet].sort(),
    tags: [...tagSet].sort(),
    source: sources.join(', '),
    richWords,
  };
}
