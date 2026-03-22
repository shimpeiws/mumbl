import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getWordgrainFileInfo,
  getWordgrainStats,
  validateWordgrainFile,
} from './WordgrainManager.js';

describe('getWordgrainFileInfo', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', () => {
    expect(getWordgrainFileInfo('/nonexistent/bad.wg.json')).toBeNull();
  });

  it('should return file info for valid .wg.json file', () => {
    const filePath = path.join(tmpDir, 'test.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'test-vocab',
        grains: [{ word: 'hello' }, { word: 'world' }],
      }),
    );

    const result = getWordgrainFileInfo(filePath);

    expect(result).toEqual({
      filename: 'test.wg.json',
      name: 'test-vocab',
      grainCount: 2,
      barCount: 0,
      type: 'grain',
    });
  });

  it('should return null for malformed file', () => {
    const badFile = path.join(tmpDir, 'bad.wg.json');
    fs.writeFileSync(badFile, '{ invalid }');

    expect(getWordgrainFileInfo(badFile)).toBeNull();
  });

  it('should return bar count for bar-type file', () => {
    const barFile = path.join(tmpDir, 'bar.wg.json');
    fs.writeFileSync(
      barFile,
      JSON.stringify({
        type: 'bar',
        meta: { artist: 'Test' },
        grains: [{ text: 'a bar' }],
      }),
    );

    const result = getWordgrainFileInfo(barFile);

    expect(result).not.toBeNull();
    expect(result?.barCount).toBe(1);
    expect(result?.grainCount).toBe(0);
    expect(result?.type).toBe('bar');
  });
});

describe('validateWordgrainFile', () => {
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

    const result = validateWordgrainFile(filePath);

    expect(result).toEqual({ success: true });
  });

  it('should reject non-existent file', () => {
    const result = validateWordgrainFile('/nonexistent/file.wg.json');

    expect(result.success).toBe(false);
    expect(result.error).toBe('File does not exist');
  });

  it('should reject path that is a directory', () => {
    const dirPath = path.join(tmpDir, 'subdir.wg.json');
    fs.mkdirSync(dirPath);

    const result = validateWordgrainFile(dirPath);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Path is not a file');
  });

  it('should reject files without .wg.json extension', () => {
    const filePath = path.join(tmpDir, 'source.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = validateWordgrainFile(filePath);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File must have .wg.json extension');
  });

  it('should reject invalid wordgrain file format', () => {
    const filePath = path.join(tmpDir, 'bad.wg.json');
    fs.writeFileSync(filePath, '{ "not": "valid" }');

    const result = validateWordgrainFile(filePath);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid wordgrain file format');
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

  it('should return empty stats for non-existent file', () => {
    const stats = getWordgrainStats('/nonexistent/path.wg.json');

    expect(stats).toEqual({
      totalGrains: 0,
      wordCount: 0,
      phraseCount: 0,
      tagCount: 0,
      barCount: 0,
    });
  });

  it('should compute stats for a single file', () => {
    const filePath = path.join(tmpDir, 'a.wg.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'vocab-a',
        grains: [
          { word: 'hello', tags: ['greeting'] },
          { word: 'good morning', tags: ['greeting', 'formal'] },
          { word: 'world', tags: ['noun'] },
        ],
      }),
    );

    const stats = getWordgrainStats(filePath);

    expect(stats.totalGrains).toBe(3);
    expect(stats.wordCount).toBe(2); // hello, world
    expect(stats.phraseCount).toBe(1); // "good morning"
    expect(stats.tagCount).toBe(3); // greeting, formal, noun
  });

  it('should handle empty grains in stats', () => {
    const emptyFile = path.join(tmpDir, 'empty.wg.json');
    fs.writeFileSync(emptyFile, JSON.stringify({ name: 'empty', grains: [] }));

    const stats = getWordgrainStats(emptyFile);

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

    const stats = getWordgrainStats(barFile);

    expect(stats.totalGrains).toBe(0);
    expect(stats.barCount).toBe(2);
  });
});
