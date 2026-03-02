import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadWordgrainFiles, parseWordgrainFile } from './wordgrain-loader.js';

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
});

describe('loadWordgrainFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-load-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load valid .wg.json files from paths', () => {
    const fileA = path.join(tmpDir, 'a.wg.json');
    const fileB = path.join(tmpDir, 'b.wg.json');
    fs.writeFileSync(fileA, JSON.stringify({ name: 'rapper-a', grains: [{ word: 'flex' }] }));
    fs.writeFileSync(fileB, JSON.stringify({ name: 'rapper-b', grains: [{ word: 'bars' }] }));

    const result = loadWordgrainFiles([fileA, fileB]);

    expect(result).toHaveLength(2);
    const names = result.map((f) => f.name).sort();
    expect(names).toEqual(['rapper-a', 'rapper-b']);
  });

  it('should return empty array for empty paths list', () => {
    const result = loadWordgrainFiles([]);
    expect(result).toEqual([]);
  });

  it('should skip non-existent files', () => {
    const validFile = path.join(tmpDir, 'valid.wg.json');
    fs.writeFileSync(validFile, JSON.stringify({ name: 'valid', grains: [{ word: 'fire' }] }));

    const result = loadWordgrainFiles(['/nonexistent/path.wg.json', validFile]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('valid');
  });

  it('should skip malformed files', () => {
    const badFile = path.join(tmpDir, 'bad.wg.json');
    const goodFile = path.join(tmpDir, 'good.wg.json');
    fs.writeFileSync(badFile, '{ invalid json }');
    fs.writeFileSync(goodFile, JSON.stringify({ name: 'valid', grains: [{ word: 'fire' }] }));

    const result = loadWordgrainFiles([badFile, goodFile]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('valid');
  });
});
