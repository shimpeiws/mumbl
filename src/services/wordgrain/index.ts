/**
 * Wordgrain vocabulary module
 */
export type {
  Bar,
  BarSource,
  Grain,
  GrainPos,
  VocabularySet,
  VocabularyWord,
  WordgrainFile,
  WordgrainType,
} from './types.js';
export { extractVocabulary } from './VocabularyExtractor.js';
export { parseWordgrainFile } from './WordgrainLoader.js';
export type { WordgrainFileInfo, WordgrainStats } from './WordgrainManager.js';
export {
  getWordgrainFileInfo,
  getWordgrainStats,
  validateWordgrainFile,
} from './WordgrainManager.js';

import { extractVocabulary } from './VocabularyExtractor.js';
import { parseWordgrainFile } from './WordgrainLoader.js';
import type { VocabularySet } from './types.js';

/**
 * Load vocabulary from a .wg.json file
 * @param filePath - Path to .wg.json file
 * @returns VocabularySet or null if file is invalid or vocabulary is empty
 */
export function loadVocabulary(filePath: string): VocabularySet | null {
  const file = parseWordgrainFile(filePath);
  if (!file) return null;

  const vocabulary = extractVocabulary(file);
  if (
    vocabulary.words.length === 0 &&
    vocabulary.phrases.length === 0 &&
    vocabulary.bars.length === 0
  )
    return null;

  return vocabulary;
}
