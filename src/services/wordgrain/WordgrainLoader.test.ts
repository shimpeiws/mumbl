import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseWordgrainFile } from './WordgrainLoader.js';

describe('parseWordgrainFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-parse-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should parse a valid .wg.json file', () => {
    const filePath = path.join(tmpDir, 'test.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test-rapper',
        grains: [
          { word: 'drip', tags: ['style'] },
          { word: 'go hard', context: 'motivation' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('test-rapper');
    expect(result?.grains).toHaveLength(2);
    expect(result?.grains[0]?.word).toBe('drip');
    expect(result?.grains[0]?.tags).toEqual(['style']);
    expect(result?.grains[1]?.word).toBe('go hard');
    expect(result?.grains[1]?.context).toBe('motivation');
  });

  it('should return null for non-existent file', () => {
    const result = parseWordgrainFile('/nonexistent/path/file.wg.json');
    expect(result).toBeNull();
  });

  it('should return null for malformed JSON', () => {
    const filePath = path.join(tmpDir, 'bad.wg.json');
    fs.writeFileSync(filePath, '{ invalid json }');
    const result = parseWordgrainFile(filePath);
    expect(result).toBeNull();
  });

  it('should return null for missing name field', () => {
    const filePath = path.join(tmpDir, 'no-name.wg.json');
    fs.writeFileSync(filePath, JSON.stringify({ grains: [{ word: 'test' }] }));
    const result = parseWordgrainFile(filePath);
    expect(result).toBeNull();
  });

  it('should return null for missing grains array', () => {
    const filePath = path.join(tmpDir, 'no-grains.wg.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test' }));
    const result = parseWordgrainFile(filePath);
    expect(result).toBeNull();
  });

  it('should skip invalid grains within a valid file', () => {
    const filePath = path.join(tmpDir, 'mixed.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'mixed',
        grains: [{ word: 'valid' }, { notAWord: 'invalid' }, 42, null, { word: 'also-valid' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(2);
    expect(result?.grains[0]?.word).toBe('valid');
    expect(result?.grains[1]?.word).toBe('also-valid');
  });

  it('should load barscan format files with meta.artist', () => {
    const filePath = path.join(tmpDir, 'barscan.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        meta: { artist: 'barscan-artist' },
        grains: [{ word: 'flow', tags: ['style'] }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('barscan-artist');
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('flow');
  });

  it('should return null for files with neither name nor meta.artist', () => {
    const filePath = path.join(tmpDir, 'no-name-no-meta.wg.json');
    fs.writeFileSync(filePath, JSON.stringify({ grains: [{ word: 'test' }] }));
    const result = parseWordgrainFile(filePath);
    expect(result).toBeNull();
  });

  it('should prefer top-level name over meta.artist', () => {
    const filePath = path.join(tmpDir, 'both.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'top-level-name',
        meta: { artist: 'meta-artist' },
        grains: [{ word: 'bars' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('top-level-name');
  });

  it('should parse grains with valid pos and frequency', () => {
    const filePath = path.join(tmpDir, 'pos-freq.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'drip', pos: 'noun', frequency: 42 },
          { word: 'flex', pos: 'verb', frequency: 10 },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(2);
    expect(result?.grains[0]?.pos).toBe('noun');
    expect(result?.grains[0]?.frequency).toBe(42);
    expect(result?.grains[1]?.pos).toBe('verb');
    expect(result?.grains[1]?.frequency).toBe(10);
  });

  it('should accept grains without pos and frequency', () => {
    const filePath = path.join(tmpDir, 'no-pos.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [{ word: 'chill' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.pos).toBeUndefined();
    expect(result?.grains[0]?.frequency).toBeUndefined();
  });

  it('should reject grains with invalid pos value', () => {
    const filePath = path.join(tmpDir, 'bad-pos.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', pos: 'noun' },
          { word: 'invalid', pos: 'bogus' },
          { word: 'also-invalid', pos: 123 },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject grains with negative frequency', () => {
    const filePath = path.join(tmpDir, 'bad-freq.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', frequency: 5 },
          { word: 'negative', frequency: -1 },
          { word: 'not-number', frequency: 'high' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should accept all valid POS values', () => {
    const posValues = [
      'noun',
      'verb',
      'adjective',
      'adverb',
      'pronoun',
      'preposition',
      'conjunction',
      'interjection',
      'determiner',
      'particle',
      'other',
    ];
    const filePath = path.join(tmpDir, 'all-pos.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: posValues.map((pos, i) => ({ word: `word${i}`, pos })),
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(posValues.length);
  });

  it('should accept frequency of zero', () => {
    const filePath = path.join(tmpDir, 'zero-freq.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [{ word: 'rare', frequency: 0 }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.frequency).toBe(0);
  });

  it('should parse grains with valid sentiment fields', () => {
    const filePath = path.join(tmpDir, 'sentiment.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'chill', sentiment: 'positive', sentiment_score: 0.8 },
          { word: 'annoying', sentiment: 'negative', sentiment_score: -1.0 },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(2);
    expect(result?.grains[0]?.sentiment).toBe('positive');
    expect(result?.grains[0]?.sentiment_score).toBe(0.8);
    expect(result?.grains[1]?.sentiment).toBe('negative');
    expect(result?.grains[1]?.sentiment_score).toBe(-1.0);
  });

  it('should accept grains without sentiment fields', () => {
    const filePath = path.join(tmpDir, 'no-sentiment.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [{ word: 'plain' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.sentiment).toBeUndefined();
    expect(result?.grains[0]?.sentiment_score).toBeUndefined();
  });

  it('should reject grains with non-string sentiment', () => {
    const filePath = path.join(tmpDir, 'bad-sentiment.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', sentiment: 'positive' },
          { word: 'invalid', sentiment: 123 },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject grains with non-number sentiment_score', () => {
    const filePath = path.join(tmpDir, 'bad-score.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', sentiment_score: 0.5 },
          { word: 'invalid', sentiment_score: 'high' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should parse v0.2.0 bar-type files', () => {
    const filePath = path.join(tmpDir, 'bar.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        schema_version: '0.2.0',
        type: 'bar',
        meta: { artist: 'KOHH' },
        grains: [
          { text: 'line one', source: { artist: 'KOHH', track: 'Track A' } },
          { text: 'line two' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('KOHH');
    expect(result?.type).toBe('bar');
    expect(result?.schemaVersion).toBe('0.2.0');
    expect(result?.grains).toHaveLength(0);
    expect(result?.bars).toHaveLength(2);
    expect(result?.bars[0]?.text).toBe('line one');
    expect(result?.bars[0]?.source?.artist).toBe('KOHH');
    expect(result?.bars[0]?.source?.track).toBe('Track A');
    expect(result?.bars[1]?.text).toBe('line two');
  });

  it('should parse mixed-type files with both grains and bars', () => {
    const filePath = path.join(tmpDir, 'mixed.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        schema_version: '0.2.0',
        type: 'mixed',
        name: 'test-mixed',
        grains: [
          { word: 'drip', tags: ['style'] },
          { text: 'lyric line', source: { artist: 'Test' } },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('mixed');
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('drip');
    expect(result?.bars).toHaveLength(1);
    expect(result?.bars[0]?.text).toBe('lyric line');
  });

  it('should default to grain type and include empty bars for v0.1.0 files', () => {
    const filePath = path.join(tmpDir, 'grain.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [{ word: 'flow' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('grain');
    expect(result?.grains).toHaveLength(1);
    expect(result?.bars).toHaveLength(0);
  });

  it('should parse v0.2.0 files with separate top-level bars array', () => {
    const filePath = path.join(tmpDir, 'v020-bars.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        schema_version: '0.2.0',
        meta: { artist: 'KOHH' },
        grains: [
          { word: 'cbd', frequency: 119, pos: 'noun' },
          { word: 'money', frequency: 50, pos: 'noun' },
        ],
        bars: [
          { text: 'line one', source: { track: 'Track A' } },
          { text: 'line two', source: { track: 'Track B' } },
          { text: 'line three' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('KOHH');
    expect(result?.type).toBe('mixed');
    expect(result?.schemaVersion).toBe('0.2.0');
    expect(result?.grains).toHaveLength(2);
    expect(result?.bars).toHaveLength(3);
    expect(result?.bars[0]?.text).toBe('line one');
    expect(result?.bars[2]?.text).toBe('line three');
  });

  it('should parse v0.2.0 files with only top-level bars array and empty grains', () => {
    const filePath = path.join(tmpDir, 'v020-bars-only.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        schema_version: '0.2.0',
        meta: { artist: 'Test' },
        grains: [],
        bars: [{ text: 'bar one' }, { text: 'bar two' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.type).toBe('bar');
    expect(result?.grains).toHaveLength(0);
    expect(result?.bars).toHaveLength(2);
  });

  it('should parse grains with valid tfidf, categories, collocations, is_slang, and definition', () => {
    const filePath = path.join(tmpDir, 'v020-fields.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          {
            word: 'drip',
            tfidf: 0.85,
            categories: ['style', 'fashion'],
            collocations: ['ice', 'flex'],
            is_slang: true,
            definition: 'stylish appearance',
          },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.tfidf).toBe(0.85);
    expect(result?.grains[0]?.categories).toEqual(['style', 'fashion']);
    expect(result?.grains[0]?.collocations).toEqual(['ice', 'flex']);
    expect(result?.grains[0]?.is_slang).toBe(true);
    expect(result?.grains[0]?.definition).toBe('stylish appearance');
  });

  it('should accept grains without new v0.2.0 fields', () => {
    const filePath = path.join(tmpDir, 'no-new-fields.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [{ word: 'plain' }],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.tfidf).toBeUndefined();
    expect(result?.grains[0]?.categories).toBeUndefined();
    expect(result?.grains[0]?.collocations).toBeUndefined();
    expect(result?.grains[0]?.is_slang).toBeUndefined();
    expect(result?.grains[0]?.definition).toBeUndefined();
  });

  it('should reject grains with negative tfidf', () => {
    const filePath = path.join(tmpDir, 'bad-tfidf.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', tfidf: 0.5 },
          { word: 'negative', tfidf: -0.1 },
          { word: 'not-number', tfidf: 'high' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject grains with non-array categories', () => {
    const filePath = path.join(tmpDir, 'bad-categories.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', categories: ['style'] },
          { word: 'invalid', categories: 'style' },
          { word: 'also-invalid', categories: [123] },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject grains with non-array collocations', () => {
    const filePath = path.join(tmpDir, 'bad-collocations.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', collocations: ['ice'] },
          { word: 'invalid', collocations: 'ice' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject grains with non-boolean is_slang', () => {
    const filePath = path.join(tmpDir, 'bad-slang.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', is_slang: true },
          { word: 'invalid', is_slang: 'yes' },
          { word: 'also-invalid', is_slang: 1 },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject grains with non-string definition', () => {
    const filePath = path.join(tmpDir, 'bad-definition.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test',
        grains: [
          { word: 'valid', definition: 'a word' },
          { word: 'invalid', definition: 123 },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.grains).toHaveLength(1);
    expect(result?.grains[0]?.word).toBe('valid');
  });

  it('should reject bar entries with non-string text', () => {
    const filePath = path.join(tmpDir, 'bad-bar.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        type: 'bar',
        meta: { artist: 'Test' },
        grains: [
          { text: 'valid bar' },
          { text: 123 },
          { notText: 'invalid' },
          { text: 'also valid' },
        ],
      }),
    );

    const result = parseWordgrainFile(filePath);

    expect(result).not.toBeNull();
    expect(result?.bars).toHaveLength(2);
    expect(result?.bars[0]?.text).toBe('valid bar');
    expect(result?.bars[1]?.text).toBe('also valid');
  });
});

