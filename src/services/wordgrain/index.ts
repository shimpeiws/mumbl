/**
 * Wordgrain vocabulary module
 */
export type { Grain, VocabularySet, WordgrainFile } from './types.js';
export { extractVocabulary } from './vocabulary-extractor.js';
export { loadWordgrainDir, parseWordgrainFile } from './wordgrain-loader.js';
export type { WordgrainFileInfo, WordgrainStats } from './wordgrain-manager.js';
export {
  addWordgrainFile,
  getWordgrainStats,
  listWordgrainFiles,
  removeWordgrainFile,
} from './wordgrain-manager.js';

import type { VocabularySet } from './types.js';
import { extractVocabulary } from './vocabulary-extractor.js';
import { loadWordgrainDir } from './wordgrain-loader.js';

/**
 * Load vocabulary from a directory of .wg.json files
 * @param dirPath - Path to directory containing .wg.json files
 * @returns VocabularySet or null if directory is missing or empty
 */
export function loadVocabulary(dirPath: string): VocabularySet | null {
  const files = loadWordgrainDir(dirPath);
  if (files.length === 0) return null;

  const vocabulary = extractVocabulary(files);
  if (vocabulary.words.length === 0 && vocabulary.phrases.length === 0) return null;

  return vocabulary;
}
