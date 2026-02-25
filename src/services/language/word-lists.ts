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
    {
      label: 'Negative/tough',
      words: ['damn', 'oof', 'rough', 'bruh', 'yikes', 'sheesh', 'nah'],
    },
    {
      label: 'Positive vibes',
      words: ['lit', 'fire', 'dope', 'nice', 'sick', 'tight', 'valid'],
    },
    { label: 'Feeling it', words: ['fr', 'real', 'facts', 'mood', 'felt', 'same', 'true'] },
    { label: 'Surprise', words: ['whoa', 'no way', 'wild', 'insane', 'crazy'] },
    { label: 'Chill', words: ['meh', 'whatever', 'hmm', 'sure'] },
    { label: 'Achievement', words: ['W', 'goated', 'clutch', 'lets go'] },
    { label: 'Sympathy', words: ['pain', 'rip', 'been there', 'big mood'] },
    { label: 'Neutral', words: ['\u00B7'] },
  ],
  ja: [
    {
      label: 'Acknowledgment',
      words: ['な', 'うん', 'そう', 'おけ', 'はい', 'あぁ', 'んん'],
    },
    {
      label: 'Negative/tough',
      words: ['やば', 'うわ', 'げ', 'つら', 'だる', 'きつ', 'マジ', 'いた'],
    },
    {
      label: 'Positive vibes',
      words: ['いい', 'よい', '最高', '神', 'よし', 'いいね', 'ないすー'],
    },
    {
      label: 'Feeling it',
      words: ['わかる', 'それな', 'だから', 'ほんま', 'それ', 'たしかに', 'ね'],
    },
    { label: 'Surprise', words: ['まじか', 'えぐ', 'うそ', 'やべ', 'は？'] },
    { label: 'Chill', words: ['ふーん', 'あっそ', 'へぇ', 'まあね'] },
    { label: 'Achievement', words: ['おつ', 'ナイス', 'すげ', 'えらい', 'よくね'] },
    { label: 'Sympathy', words: ['つらみ', 'あるある', 'しゃない', 'わかりみ'] },
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
