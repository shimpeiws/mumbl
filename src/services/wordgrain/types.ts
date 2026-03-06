/**
 * Types for wordgrain vocabulary integration
 */

export type GrainPos =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'determiner'
  | 'particle'
  | 'other';

export interface Grain {
  word: string;
  context?: string;
  tags?: string[];
  pos?: GrainPos;
  frequency?: number;
}

export interface VocabularyWord {
  word: string;
  pos?: GrainPos;
  frequency?: number;
}

export interface BarSource {
  artist?: string;
  track?: string;
  album?: string;
  year?: number;
}

export interface Bar {
  text: string;
  source?: BarSource;
  language?: string;
}

export type WordgrainType = 'grain' | 'bar' | 'mixed';

export interface WordgrainMeta {
  artist?: string;
}

export interface WordgrainFile {
  name: string;
  meta?: WordgrainMeta;
  type?: WordgrainType;
  schemaVersion?: string;
  grains: Grain[];
  bars: Bar[];
}

export interface VocabularySet {
  words: string[];
  phrases: string[];
  tags: string[];
  source: string;
  richWords: VocabularyWord[];
  bars: Bar[];
}
