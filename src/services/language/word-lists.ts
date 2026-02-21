import type { DetectedLanguage } from './types.js';

interface WordCategory {
  label: string;
  words: string[];
}

/**
 * Reaction words organized by language and category.
 */
export const REACTION_WORDS: Record<DetectedLanguage, WordCategory[]> = {
  en: [
    {
      label: 'Acknowledgment',
      words: ['bet', 'word', 'aight', 'cool', 'k', 'yo', 'yea', 'uh-huh'],
    },
    { label: 'Negative/tough', words: ['damn', 'oof', 'rough', 'bruh', 'yikes', 'sheesh', 'nah'] },
    { label: 'Positive vibes', words: ['lit', 'fire', 'dope', 'nice', 'sick', 'tight', 'valid'] },
    { label: 'Feeling it', words: ['fr', 'real', 'facts', 'mood', 'felt', 'same', 'true'] },
    { label: 'Neutral', words: ['\u00B7'] },
  ],
  ja: [
    { label: 'Acknowledgment', words: ['na', 'un', 'sou', 'oke', 'hai', 'ah', 'nn'] },
    { label: 'Negative/tough', words: ['tsura', 'yaba', 'uwa', 'geh', 'maji', 'ore-mo', 'ita'] },
    { label: 'Positive vibes', words: ['ii', 'yoi', 'saikou', 'kami', 'yoshi', 'ii-ne', 'naisuu'] },
    {
      label: 'Feeling it',
      words: ['wakaru', 'sore-na', 'dakara', 'honma', 'sore', 'tashika-ni', 'ne'],
    },
    { label: 'Neutral', words: ['\u00B7'] },
  ],
};

/**
 * Format a word list for a given language into a prompt-ready string.
 */
export function getWordListForLanguage(language: DetectedLanguage): string {
  const categories = REACTION_WORDS[language];
  return categories.map((cat) => `- ${cat.label}: ${cat.words.join(', ')}`).join('\n');
}
