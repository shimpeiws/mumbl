import { describe, expect, it } from 'vitest';
import { getStopWords, isStopWord } from './stopwords.js';

describe('isStopWord', () => {
  it('should recognize common English stop words', () => {
    expect(isStopWord('the')).toBe(true);
    expect(isStopWord('is')).toBe(true);
    expect(isStopWord('and')).toBe(true);
    expect(isStopWord('very')).toBe(true);
  });

  it('should recognize Japanese particles', () => {
    expect(isStopWord('\u306F')).toBe(true); // ha
    expect(isStopWord('\u304C')).toBe(true); // ga
    expect(isStopWord('\u3092')).toBe(true); // wo
  });

  it('should not flag meaningful words as stop words', () => {
    expect(isStopWord('coffee')).toBe(false);
    expect(isStopWord('project')).toBe(false);
    expect(isStopWord('deadline')).toBe(false);
  });
});

describe('getStopWords', () => {
  it('should return a non-empty set', () => {
    const words = getStopWords();
    expect(words.size).toBeGreaterThan(0);
  });

  it('should contain both English and Japanese stop words', () => {
    const words = getStopWords();
    expect(words.has('the')).toBe(true);
    expect(words.has('\u306F')).toBe(true); // ha
  });
});
