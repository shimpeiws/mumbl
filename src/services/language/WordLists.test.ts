import { describe, expect, it } from 'vitest';
import { REACTION_WORDS, getWordListForLanguage } from './WordLists.js';

describe('REACTION_WORDS', () => {
  it('should have entries for both languages', () => {
    expect(REACTION_WORDS.en).toBeDefined();
    expect(REACTION_WORDS.ja).toBeDefined();
  });

  it('should have the same number of categories for each language', () => {
    expect(REACTION_WORDS.en.length).toBe(REACTION_WORDS.ja.length);
  });

  it('should have non-empty word arrays in all categories', () => {
    for (const lang of ['en', 'ja'] as const) {
      for (const category of REACTION_WORDS[lang]) {
        expect(category.words.length).toBeGreaterThan(0);
        expect(category.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('should include neutral category with dot for both languages', () => {
    for (const lang of ['en', 'ja'] as const) {
      const neutral = REACTION_WORDS[lang].find((c) => c.label === 'Neutral');
      expect(neutral).toBeDefined();
      expect(neutral?.words).toContain('\u00B7');
    }
  });
});

describe('getWordListForLanguage', () => {
  it('should return a formatted string for English', () => {
    const result = getWordListForLanguage('en');
    expect(result).toContain('- Acknowledgment:');
    expect(result).toContain('bet');
    expect(result).toContain('- Negative/tough:');
    expect(result).toContain('- Positive vibes:');
    expect(result).toContain('- Feeling it:');
    expect(result).toContain('- Surprise:');
    expect(result).toContain('- Chill:');
    expect(result).toContain('- Achievement:');
    expect(result).toContain('- Sympathy:');
    expect(result).toContain('- Neutral:');
  });

  it('should return a formatted string for Japanese', () => {
    const result = getWordListForLanguage('ja');
    expect(result).toContain('- Acknowledgment:');
    expect(result).toContain('な');
    expect(result).toContain('わかる');
    expect(result).toContain('- Surprise:');
    expect(result).toContain('まじか');
    expect(result).toContain('- Chill:');
    expect(result).toContain('- Achievement:');
    expect(result).toContain('おつ');
    expect(result).toContain('- Sympathy:');
    expect(result).toContain('つらみ');
    expect(result).toContain('- Neutral:');
  });

  it('should have one line per category', () => {
    const enLines = getWordListForLanguage('en').split('\n');
    const jaLines = getWordListForLanguage('ja').split('\n');
    expect(enLines.length).toBe(REACTION_WORDS.en.length);
    expect(jaLines.length).toBe(REACTION_WORDS.ja.length);
  });
});
