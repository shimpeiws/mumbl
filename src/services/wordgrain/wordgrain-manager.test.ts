import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getWordgrainStats,
  listWordgrainFiles,
  registerWordgrainFile,
} from './wordgrain-manager.js';

describe('listWordgrainFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array for empty paths list', () => {
    expect(listWordgrainFiles([])).toEqual([]);
  });

  it('should list valid .wg.json files with metadata', () => {
    const filePath = path.join(tmpDir, 'test.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test-vocab',
        grains: [{ word: 'hello' }, { word: 'world' }],
      }),
    );

    const result = listWordgrainFiles([filePath]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: 'test.wg.json',
      name: 'test-vocab',
      grainCount: 2,
      barCount: 0,
      type: 'grain',
    });
  });

  it('should sort files alphabetically by filename', () => {
    const fileB = path.join(tmpDir, 'b.wg.json');
    const fileA = path.join(tmpDir, 'a.wg.json');
    fs.writeFileSync(fileB, JSON.stringify({ name: 'beta', grains: [{ word: 'b' }] }));
    fs.writeFileSync(fileA, JSON.stringify({ name: 'alpha', grains: [{ word: 'a' }] }));

    const result = listWordgrainFiles([fileB, fileA]);

    expect(result).toHaveLength(2);
    expect(result[0]?.filename).toBe('a.wg.json');
    expect(result[1]?.filename).toBe('b.wg.json');
  });

  it('should skip non-existent files', () => {
    const goodFile = path.join(tmpDir, 'good.wg.json');
    fs.writeFileSync(goodFile, JSON.stringify({ name: 'valid', grains: [{ word: 'ok' }] }));

    const result = listWordgrainFiles(['/nonexistent/bad.wg.json', goodFile]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('valid');
  });

  it('should skip malformed files', () => {
    const badFile = path.join(tmpDir, 'bad.wg.json');
    const goodFile = path.join(tmpDir, 'good.wg.json');
    fs.writeFileSync(badFile, '{ invalid }');
    fs.writeFileSync(goodFile, JSON.stringify({ name: 'valid', grains: [{ word: 'ok' }] }));

    const result = listWordgrainFiles([badFile, goodFile]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('valid');
  });
});

describe('registerWordgrainFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-reg-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should accept a valid .wg.json file', () => {
    const filePath = path.join(tmpDir, 'source.wg.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = registerWordgrainFile(filePath, []);

    expect(result).toEqual({ success: true });
  });

  it('should reject non-existent file', () => {
    const result = registerWordgrainFile('/nonexistent/file.wg.json', []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File does not exist');
  });

  it('should reject path that is a directory', () => {
    const dirPath = path.join(tmpDir, 'subdir.wg.json');
    fs.mkdirSync(dirPath);

    const result = registerWordgrainFile(dirPath, []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Path is not a file');
  });

  it('should reject files without .wg.json extension', () => {
    const filePath = path.join(tmpDir, 'source.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = registerWordgrainFile(filePath, []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File must have .wg.json extension');
  });

  it('should reject invalid wordgrain file format', () => {
    const filePath = path.join(tmpDir, 'bad.wg.json');
    fs.writeFileSync(filePath, '{ "not": "valid" }');

    const result = registerWordgrainFile(filePath, []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid wordgrain file format');
  });

  it('should reject already registered file', () => {
    const filePath = path.join(tmpDir, 'dup.wg.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = registerWordgrainFile(filePath, [filePath]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File is already registered');
  });

  it('should detect duplicate registration by resolved path', () => {
    const filePath = path.join(tmpDir, 'dup.wg.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));
    // Use a relative-looking path that resolves to the same file
    const existingPath = path.resolve(filePath);

    const result = registerWordgrainFile(filePath, [existingPath]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File is already registered');
  });
});

describe('getWordgrainStats', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-stats-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty stats for empty paths list', () => {
    const stats = getWordgrainStats([]);

    expect(stats).toEqual({
      totalFiles: 0,
      totalGrains: 0,
      wordCount: 0,
      phraseCount: 0,
      tagCount: 0,
      barCount: 0,
    });
  });

  it('should return empty stats for non-existent files', () => {
    const stats = getWordgrainStats(['/nonexistent/path.wg.json']);

    expect(stats).toEqual({
      totalFiles: 0,
      totalGrains: 0,
      wordCount: 0,
      phraseCount: 0,
      tagCount: 0,
      barCount: 0,
    });
  });

  it('should compute aggregate stats across files', () => {
    const fileA = path.join(tmpDir, 'a.wg.json');
    const fileB = path.join(tmpDir, 'b.wg.json');
    fs.writeFileSync(
      fileA,
      JSON.stringify({
        name: 'vocab-a',
        grains: [
          { word: 'hello', tags: ['greeting'] },
          { word: 'good morning', tags: ['greeting', 'formal'] },
        ],
      }),
    );
    fs.writeFileSync(
      fileB,
      JSON.stringify({
        name: 'vocab-b',
        grains: [
          { word: 'world', tags: ['noun'] },
          { word: 'hello' }, // duplicate word
        ],
      }),
    );

    const stats = getWordgrainStats([fileA, fileB]);

    expect(stats.totalFiles).toBe(2);
    expect(stats.totalGrains).toBe(4);
    expect(stats.wordCount).toBe(2); // hello, world (deduplicated)
    expect(stats.phraseCount).toBe(1); // "good morning"
    expect(stats.tagCount).toBe(3); // greeting, formal, noun
  });

  it('should skip malformed files', () => {
    const badFile = path.join(tmpDir, 'bad.wg.json');
    const goodFile = path.join(tmpDir, 'good.wg.json');
    fs.writeFileSync(badFile, '{ invalid }');
    fs.writeFileSync(goodFile, JSON.stringify({ name: 'valid', grains: [{ word: 'ok' }] }));

    const stats = getWordgrainStats([badFile, goodFile]);

    expect(stats.totalFiles).toBe(1);
    expect(stats.totalGrains).toBe(1);
  });

  it('should handle empty grains in stats', () => {
    const emptyFile = path.join(tmpDir, 'empty.wg.json');
    fs.writeFileSync(emptyFile, JSON.stringify({ name: 'empty', grains: [] }));

    const stats = getWordgrainStats([emptyFile]);

    expect(stats.totalFiles).toBe(1);
    expect(stats.totalGrains).toBe(0);
    expect(stats.wordCount).toBe(0);
  });

  it('should count bars in bar-type files', () => {
    const barFile = path.join(tmpDir, 'bar.wg.json');
    fs.writeFileSync(
      barFile,
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

    const stats = getWordgrainStats([barFile]);

    expect(stats.totalFiles).toBe(1);
    expect(stats.totalGrains).toBe(0);
    expect(stats.barCount).toBe(2);
  });

  it('should include bar count in file info', () => {
    const barFile = path.join(tmpDir, 'bar.wg.json');
    fs.writeFileSync(
      barFile,
      JSON.stringify({
        type: 'bar',
        meta: { artist: 'Test' },
        grains: [{ text: 'a bar' }],
      }),
    );

    const result = listWordgrainFiles([barFile]);

    expect(result).toHaveLength(1);
    expect(result[0]?.barCount).toBe(1);
    expect(result[0]?.grainCount).toBe(0);
    expect(result[0]?.type).toBe('bar');
  });
});
