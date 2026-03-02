/**
 * Wordgrain vocabulary module
 */
export type { Grain, GrainPos, VocabularySet, VocabularyWord, WordgrainFile } from './types.js';
export { extractVocabulary } from './vocabulary-extractor.js';
export { loadWordgrainFiles, parseWordgrainFile } from './wordgrain-loader.js';
export type { WordgrainFileInfo, WordgrainStats } from './wordgrain-manager.js';
export {
  getWordgrainStats,
  listWordgrainFiles,
  registerWordgrainFile,
} from './wordgrain-manager.js';

import type { VocabularySet } from './types.js';
import { extractVocabulary } from './vocabulary-extractor.js';
import { loadWordgrainFiles } from './wordgrain-loader.js';

/**
 * Load vocabulary from individual .wg.json file paths
 * @param filePaths - Array of paths to .wg.json files
 * @returns VocabularySet or null if no valid files or vocabulary is empty
 */
export function loadVocabulary(filePaths: string[]): VocabularySet | null {
  const files = loadWordgrainFiles(filePaths);
  if (files.length === 0) return null;

  const vocabulary = extractVocabulary(files);
  if (vocabulary.words.length === 0 && vocabulary.phrases.length === 0) return null;

  return vocabulary;
}
