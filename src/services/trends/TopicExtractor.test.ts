import { describe, expect, it } from 'vitest';
import { extractTopics } from './TopicExtractor.js';

describe('extractTopics', () => {
  it('should return empty array for empty content', () => {
    expect(extractTopics('')).toEqual([]);
    expect(extractTopics('   ')).toEqual([]);
  });

  it('should extract single-word topics from English text', () => {
    const topics = extractTopics('Coffee was stressful morning');
    expect(topics).toContain('coffee');
    expect(topics).toContain('stressful');
    expect(topics).toContain('morning');
  });

  it('should filter out English stop words', () => {
    const topics = extractTopics('The quick brown fox is very fast');
    expect(topics).not.toContain('the');
    expect(topics).not.toContain('is');
    expect(topics).not.toContain('very');
    expect(topics).toContain('quick');
    expect(topics).toContain('brown');
    expect(topics).toContain('fox');
    expect(topics).toContain('fast');
  });

  it('should extract bigrams from meaningful adjacent words', () => {
    const topics = extractTopics('project deadline approaching fast');
    expect(topics).toContain('project deadline');
    expect(topics).toContain('deadline approaching');
    expect(topics).toContain('approaching fast');
  });

  it('should extract trigrams with at least 2 non-stop words', () => {
    const topics = extractTopics('coffee morning routine');
    expect(topics).toContain('coffee morning routine');
  });

  it('should normalize text to lowercase', () => {
    const topics = extractTopics('COFFEE Morning');
    expect(topics).toContain('coffee');
    expect(topics).toContain('morning');
    expect(topics).toContain('coffee morning');
  });

  it('should handle punctuation correctly', () => {
    const topics = extractTopics('coffee, sleep, repeat!');
    expect(topics).toContain('coffee');
    expect(topics).toContain('sleep');
    expect(topics).toContain('repeat');
  });

  it('should limit topics to maximum of 10', () => {
    const longText =
      'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu';
    const topics = extractTopics(longText);
    expect(topics.length).toBeLessThanOrEqual(10);
  });

  it('should deduplicate topics', () => {
    const topics = extractTopics('coffee coffee coffee');
    const coffeeOccurrences = topics.filter((t) => t === 'coffee');
    expect(coffeeOccurrences).toHaveLength(1);
  });

  it('should prioritize longer phrases over single words', () => {
    const topics = extractTopics('project deadline stress');
    // Trigrams come first, then bigrams, then unigrams
    const trigramIdx = topics.indexOf('project deadline stress');
    const unigramIdx = topics.indexOf('project');
    if (trigramIdx >= 0 && unigramIdx >= 0) {
      expect(trigramIdx).toBeLessThan(unigramIdx);
    }
  });

  it('should filter out short tokens', () => {
    const topics = extractTopics('I a x coffee');
    expect(topics).not.toContain('x');
    expect(topics).toContain('coffee');
  });

  it('should handle mixed content with special characters', () => {
    const topics = extractTopics('email@work.com project-update #deadline');
    expect(topics.length).toBeGreaterThan(0);
  });

  it('should extract topics from Japanese text', () => {
    const topics = extractTopics('仕事がつらい');
    expect(topics.length).toBeGreaterThan(0);
    expect(topics).toContain('仕事');
    expect(topics).toContain('つらい');
  });

  it('should extract topics from longer Japanese sentences', () => {
    const topics = extractTopics('今日は天気がいいので散歩した');
    expect(topics.length).toBeGreaterThan(0);
    expect(topics).toContain('今日');
    expect(topics).toContain('天気');
  });
});
