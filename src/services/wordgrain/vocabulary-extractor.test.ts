import { describe, expect, it } from 'vitest';
import type { WordgrainFile } from './types.js';
import { extractVocabulary } from './vocabulary-extractor.js';

describe('extractVocabulary', () => {
  it('should extract words from grains', () => {
    const files: WordgrainFile[] = [{ name: 'test', grains: [{ word: 'drip' }, { word: 'flex' }] }];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['drip', 'flex']);
    expect(result.phrases).toEqual([]);
    expect(result.source).toBe('test');
  });

  it('should separate multi-word grains as phrases', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [{ word: 'drip' }, { word: 'go hard' }, { word: 'no cap' }],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['drip']);
    expect(result.phrases).toEqual(['go hard', 'no cap']);
  });

  it('should deduplicate words and phrases', () => {
    const files: WordgrainFile[] = [
      { name: 'a', grains: [{ word: 'drip' }, { word: 'flex' }] },
      { name: 'b', grains: [{ word: 'drip' }, { word: 'fire' }] },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['drip', 'fire', 'flex']);
  });

  it('should collect and deduplicate tags', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          { word: 'drip', tags: ['style', 'fashion'] },
          { word: 'flex', tags: ['style', 'money'] },
        ],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.tags).toEqual(['fashion', 'money', 'style']);
  });

  it('should return empty arrays for empty input', () => {
    const result = extractVocabulary([]);

    expect(result.words).toEqual([]);
    expect(result.phrases).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.source).toBe('');
  });

  it('should skip empty/whitespace-only words', () => {
    const files: WordgrainFile[] = [
      { name: 'test', grains: [{ word: '' }, { word: '   ' }, { word: 'valid' }] },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['valid']);
  });

  it('should sort words and phrases alphabetically', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [{ word: 'zap' }, { word: 'ace' }, { word: 'no cap' }, { word: 'all day' }],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['ace', 'zap']);
    expect(result.phrases).toEqual(['all day', 'no cap']);
  });

  it('should join multiple file names as source', () => {
    const files: WordgrainFile[] = [
      { name: 'future', grains: [{ word: 'drip' }] },
      { name: 'travis', grains: [{ word: 'flame' }] },
    ];

    const result = extractVocabulary(files);

    expect(result.source).toBe('future, travis');
  });

  it('should skip empty tags', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [{ word: 'drip', tags: ['style', '', '  '] }],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.tags).toEqual(['style']);
  });
});
