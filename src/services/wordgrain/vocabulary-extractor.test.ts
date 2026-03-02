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

  it('should generate richWords with pos and frequency metadata', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          { word: 'drip', pos: 'noun', frequency: 42 },
          { word: 'flex', pos: 'verb', frequency: 10 },
        ],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(2);
    expect(result.richWords[0]).toEqual({ word: 'drip', pos: 'noun', frequency: 42 });
    expect(result.richWords[1]).toEqual({ word: 'flex', pos: 'verb', frequency: 10 });
  });

  it('should generate richWords without metadata when pos/frequency absent', () => {
    const files: WordgrainFile[] = [
      { name: 'test', grains: [{ word: 'chill' }, { word: 'vibe' }] },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(2);
    expect(result.richWords[0]).toEqual({ word: 'chill' });
    expect(result.richWords[1]).toEqual({ word: 'vibe' });
  });

  it('should merge duplicate words keeping max frequency and first pos', () => {
    const files: WordgrainFile[] = [
      {
        name: 'a',
        grains: [{ word: 'drip', pos: 'noun', frequency: 10 }],
      },
      {
        name: 'b',
        grains: [{ word: 'drip', pos: 'verb', frequency: 50 }],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(1);
    expect(result.richWords[0]).toEqual({ word: 'drip', pos: 'noun', frequency: 50 });
  });

  it('should handle mixed grains with and without metadata', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          { word: 'drip', pos: 'noun', frequency: 42 },
          { word: 'chill' },
          { word: 'flex', frequency: 5 },
        ],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(3);
    expect(result.richWords[0]).toEqual({ word: 'chill' });
    expect(result.richWords[1]).toEqual({ word: 'drip', pos: 'noun', frequency: 42 });
    expect(result.richWords[2]).toEqual({ word: 'flex', frequency: 5 });
  });

  it('should return empty richWords for empty input', () => {
    const result = extractVocabulary([]);

    expect(result.richWords).toEqual([]);
  });

  it('should not include phrases in richWords', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          { word: 'drip', pos: 'noun' },
          { word: 'go hard', pos: 'verb' },
        ],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(1);
    expect(result.richWords[0]?.word).toBe('drip');
  });

  it('should keep richWords in same sorted order as words', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          { word: 'zap', frequency: 1 },
          { word: 'ace', frequency: 99 },
        ],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['ace', 'zap']);
    expect(result.richWords.map((rw) => rw.word)).toEqual(['ace', 'zap']);
  });
});
