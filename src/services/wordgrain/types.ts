/**
 * Types for wordgrain vocabulary integration
 */

export interface Grain {
  word: string;
  context?: string;
  tags?: string[];
}

export interface WordgrainMeta {
  artist?: string;
}

export interface WordgrainFile {
  name: string;
  meta?: WordgrainMeta;
  grains: Grain[];
}

export interface VocabularySet {
  words: string[];
  phrases: string[];
  tags: string[];
  source: string;
}
