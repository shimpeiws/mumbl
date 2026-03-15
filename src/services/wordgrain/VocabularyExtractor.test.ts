import { describe, expect, it } from 'vitest';
import type { WordgrainFile } from './types.js';
import { extractVocabulary } from './VocabularyExtractor.js';

describe('extractVocabulary', () => {
  it('should extract words from grains', () => {
    const files: WordgrainFile[] = [
      { name: 'test', grains: [{ word: 'drip' }, { word: 'flex' }], bars: [] },
    ];

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
        bars: [],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['drip']);
    expect(result.phrases).toEqual(['go hard', 'no cap']);
  });

  it('should deduplicate words and phrases', () => {
    const files: WordgrainFile[] = [
      { name: 'a', grains: [{ word: 'drip' }, { word: 'flex' }], bars: [] },
      { name: 'b', grains: [{ word: 'drip' }, { word: 'fire' }], bars: [] },
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
        bars: [],
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
    expect(result.bars).toEqual([]);
  });

  it('should skip empty/whitespace-only words', () => {
    const files: WordgrainFile[] = [
      { name: 'test', grains: [{ word: '' }, { word: '   ' }, { word: 'valid' }], bars: [] },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['valid']);
  });

  it('should sort words and phrases alphabetically', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [{ word: 'zap' }, { word: 'ace' }, { word: 'no cap' }, { word: 'all day' }],
        bars: [],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['ace', 'zap']);
    expect(result.phrases).toEqual(['all day', 'no cap']);
  });

  it('should join multiple file names as source', () => {
    const files: WordgrainFile[] = [
      { name: 'future', grains: [{ word: 'drip' }], bars: [] },
      { name: 'travis', grains: [{ word: 'flame' }], bars: [] },
    ];

    const result = extractVocabulary(files);

    expect(result.source).toBe('future, travis');
  });

  it('should skip empty tags', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [{ word: 'drip', tags: ['style', '', '  '] }],
        bars: [],
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
        bars: [],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(2);
    expect(result.richWords[0]).toEqual({ word: 'drip', pos: 'noun', frequency: 42 });
    expect(result.richWords[1]).toEqual({ word: 'flex', pos: 'verb', frequency: 10 });
  });

  it('should generate richWords without metadata when pos/frequency absent', () => {
    const files: WordgrainFile[] = [
      { name: 'test', grains: [{ word: 'chill' }, { word: 'vibe' }], bars: [] },
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
        bars: [],
      },
      {
        name: 'b',
        grains: [{ word: 'drip', pos: 'verb', frequency: 50 }],
        bars: [],
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
        bars: [],
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
        bars: [],
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
        bars: [],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.words).toEqual(['ace', 'zap']);
    expect(result.richWords.map((rw) => rw.word)).toEqual(['ace', 'zap']);
  });

  it('should collect bars from files and deduplicate by text', () => {
    const files: WordgrainFile[] = [
      {
        name: 'KOHH',
        grains: [],
        bars: [
          { text: 'line one', source: { artist: 'KOHH', track: 'Track A' } },
          { text: 'line two' },
        ],
      },
      {
        name: 'Other',
        grains: [],
        bars: [
          { text: 'line one', source: { artist: 'KOHH', track: 'Track B' } },
          { text: 'line three' },
        ],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.bars).toHaveLength(3);
    expect(result.bars.map((b) => b.text)).toEqual(['line one', 'line two', 'line three']);
    expect(result.bars[0]?.source?.track).toBe('Track A');
  });

  it('should preserve sentiment in richWords from grain data', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          { word: 'chill', sentiment: 'positive', sentiment_score: 0.8 },
          { word: 'annoying', sentiment: 'negative', sentiment_score: -1.0 },
          { word: 'plain' },
        ],
        bars: [],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.richWords).toHaveLength(3);
    const annoying = result.richWords.find((w) => w.word === 'annoying');
    expect(annoying?.sentiment).toBe('negative');
    expect(annoying?.sentimentScore).toBe(-1.0);

    const chill = result.richWords.find((w) => w.word === 'chill');
    expect(chill?.sentiment).toBe('positive');
    expect(chill?.sentimentScore).toBe(0.8);

    const plain = result.richWords.find((w) => w.word === 'plain');
    expect(plain?.sentiment).toBeUndefined();
    expect(plain?.sentimentScore).toBeUndefined();
  });

  it('should extract tfidf, collocations, categories, and isSlang into richWords', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [
          {
            word: 'drip',
            tfidf: 0.85,
            categories: ['style', 'fashion'],
            collocations: ['ice', 'flex'],
            is_slang: true,
          },
          { word: 'chill' },
        ],
        bars: [],
      },
    ];

    const result = extractVocabulary(files);

    const drip = result.richWords.find((w) => w.word === 'drip');
    expect(drip?.tfidf).toBe(0.85);
    expect(drip?.categories).toEqual(['style', 'fashion']);
    expect(drip?.collocations).toEqual(['ice', 'flex']);
    expect(drip?.isSlang).toBe(true);

    const chill = result.richWords.find((w) => w.word === 'chill');
    expect(chill?.tfidf).toBeUndefined();
    expect(chill?.categories).toBeUndefined();
    expect(chill?.collocations).toBeUndefined();
    expect(chill?.isSlang).toBeUndefined();
  });

  it('should merge tfidf keeping max value on duplicates', () => {
    const files: WordgrainFile[] = [
      {
        name: 'a',
        grains: [{ word: 'drip', tfidf: 0.3 }],
        bars: [],
      },
      {
        name: 'b',
        grains: [{ word: 'drip', tfidf: 0.8 }],
        bars: [],
      },
    ];

    const result = extractVocabulary(files);
    const drip = result.richWords.find((w) => w.word === 'drip');
    expect(drip?.tfidf).toBe(0.8);
  });

  it('should merge collocations and categories deduplicating on duplicates', () => {
    const files: WordgrainFile[] = [
      {
        name: 'a',
        grains: [{ word: 'drip', collocations: ['ice', 'flex'], categories: ['style'] }],
        bars: [],
      },
      {
        name: 'b',
        grains: [{ word: 'drip', collocations: ['flex', 'sauce'], categories: ['style', 'slang'] }],
        bars: [],
      },
    ];

    const result = extractVocabulary(files);
    const drip = result.richWords.find((w) => w.word === 'drip');
    expect(drip?.collocations).toEqual(['ice', 'flex', 'sauce']);
    expect(drip?.categories).toEqual(['style', 'slang']);
  });

  it('should OR isSlang across duplicate grains', () => {
    const files: WordgrainFile[] = [
      {
        name: 'a',
        grains: [{ word: 'drip', is_slang: false }],
        bars: [],
      },
      {
        name: 'b',
        grains: [{ word: 'drip', is_slang: true }],
        bars: [],
      },
    ];

    const result = extractVocabulary(files);
    const drip = result.richWords.find((w) => w.word === 'drip');
    expect(drip?.isSlang).toBe(true);
  });

  it('should skip bars with empty text', () => {
    const files: WordgrainFile[] = [
      {
        name: 'test',
        grains: [],
        bars: [{ text: '' }, { text: '  ' }, { text: 'valid bar' }],
      },
    ];

    const result = extractVocabulary(files);

    expect(result.bars).toHaveLength(1);
    expect(result.bars[0]?.text).toBe('valid bar');
  });
});
