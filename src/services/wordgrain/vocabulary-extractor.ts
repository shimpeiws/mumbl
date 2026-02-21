/**
 * Extract vocabulary from wordgrain files
 */
import type { VocabularySet, WordgrainFile } from './types.js';

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

  for (const file of files) {
    sources.push(file.name);
    for (const grain of file.grains) {
      const trimmed = grain.word.trim();
      if (!trimmed) continue;

      if (trimmed.includes(' ')) {
        phraseSet.add(trimmed);
      } else {
        wordSet.add(trimmed);
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

  return {
    words: [...wordSet].sort(),
    phrases: [...phraseSet].sort(),
    tags: [...tagSet].sort(),
    source: sources.join(', '),
  };
}
