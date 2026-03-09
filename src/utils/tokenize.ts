/**
 * Shared tokenization utility with language-aware segmentation.
 * Uses Intl.Segmenter for Japanese text, regex splitting for English.
 */

import { detectLanguage } from '../services/language/detect.js';

const MIN_TOKEN_LENGTH = 2;
const PUNCTUATION_SPLIT = /[\s,.!?;:'"()\[\]{}\-_/\\|@#$%^&*+=<>~`]+/;

function tokenizeEnglish(text: string): string[] {
  return text.split(PUNCTUATION_SPLIT).filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

function tokenizeJapanese(text: string): string[] {
  const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
  return [...segmenter.segment(text)]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

export function tokenize(text: string): string[] {
  const language = detectLanguage(text);
  if (language === 'ja') {
    return tokenizeJapanese(text);
  }
  return tokenizeEnglish(text);
}
