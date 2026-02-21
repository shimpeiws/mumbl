/**
 * Types for wordgrain vocabulary integration
 */

export interface Grain {
  word: string;
  context?: string;
  tags?: string[];
}

export interface WordgrainFile {
  name: string;
  grains: Grain[];
}

export interface VocabularySet {
  words: string[];
  phrases: string[];
  tags: string[];
  source: string;
}
