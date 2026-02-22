import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addWordgrainFile,
  getWordgrainStats,
  listWordgrainFiles,
  removeWordgrainFile,
} from './wordgrain-manager.js';

describe('listWordgrainFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array for missing directory', () => {
    expect(listWordgrainFiles('/nonexistent/path')).toEqual([]);
  });

  it('should return empty array for empty directory', () => {
    expect(listWordgrainFiles(tmpDir)).toEqual([]);
  });

  it('should list valid .wg.json files with metadata', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'test.wg.json'),
      JSON.stringify({
        name: 'test-vocab',
        grains: [{ word: 'hello' }, { word: 'world' }],
      }),
    );

    const result = listWordgrainFiles(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      filename: 'test.wg.json',
      name: 'test-vocab',
      grainCount: 2,
    });
  });

  it('should sort files alphabetically by filename', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'b.wg.json'),
      JSON.stringify({ name: 'beta', grains: [{ word: 'b' }] }),
    );
    fs.writeFileSync(
      path.join(tmpDir, 'a.wg.json'),
      JSON.stringify({ name: 'alpha', grains: [{ word: 'a' }] }),
    );

    const result = listWordgrainFiles(tmpDir);

    expect(result).toHaveLength(2);
    expect(result[0]?.filename).toBe('a.wg.json');
    expect(result[1]?.filename).toBe('b.wg.json');
  });

  it('should skip malformed files', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.wg.json'), '{ invalid }');
    fs.writeFileSync(
      path.join(tmpDir, 'good.wg.json'),
      JSON.stringify({ name: 'valid', grains: [{ word: 'ok' }] }),
    );

    const result = listWordgrainFiles(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('valid');
  });

  it('should return empty array when path is a file', () => {
    const filePath = path.join(tmpDir, 'not-a-dir');
    fs.writeFileSync(filePath, 'hello');
    expect(listWordgrainFiles(filePath)).toEqual([]);
  });
});

describe('addWordgrainFile', () => {
  let tmpDir: string;
  let targetDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-add-'));
    targetDir = path.join(tmpDir, 'target');
    fs.mkdirSync(targetDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should copy a valid .wg.json file to target directory', () => {
    const sourcePath = path.join(tmpDir, 'source.wg.json');
    fs.writeFileSync(sourcePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = addWordgrainFile(sourcePath, targetDir);

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(path.join(targetDir, 'source.wg.json'))).toBe(true);
  });

  it('should create target directory if it does not exist', () => {
    const newTarget = path.join(tmpDir, 'new-dir');
    const sourcePath = path.join(tmpDir, 'source.wg.json');
    fs.writeFileSync(sourcePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = addWordgrainFile(sourcePath, newTarget);

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(path.join(newTarget, 'source.wg.json'))).toBe(true);
  });

  it('should reject non-existent source file', () => {
    const result = addWordgrainFile('/nonexistent/file.wg.json', targetDir);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Source file does not exist');
  });

  it('should reject source that is a directory', () => {
    const dirSource = path.join(tmpDir, 'subdir.wg.json');
    fs.mkdirSync(dirSource);

    const result = addWordgrainFile(dirSource, targetDir);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Source path is not a file');
  });

  it('should reject files without .wg.json extension', () => {
    const sourcePath = path.join(tmpDir, 'source.json');
    fs.writeFileSync(sourcePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));

    const result = addWordgrainFile(sourcePath, targetDir);

    expect(result.success).toBe(false);
    expect(result.error).toBe('File must have .wg.json extension');
  });

  it('should reject invalid wordgrain file format', () => {
    const sourcePath = path.join(tmpDir, 'bad.wg.json');
    fs.writeFileSync(sourcePath, '{ "not": "valid" }');

    const result = addWordgrainFile(sourcePath, targetDir);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid wordgrain file format');
  });

  it('should reject when file already exists in target', () => {
    const sourcePath = path.join(tmpDir, 'dup.wg.json');
    fs.writeFileSync(sourcePath, JSON.stringify({ name: 'test', grains: [{ word: 'hello' }] }));
    fs.writeFileSync(path.join(targetDir, 'dup.wg.json'), '{}');

    const result = addWordgrainFile(sourcePath, targetDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });
});

describe('removeWordgrainFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-mgr-rm-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should remove an existing file', () => {
    const filePath = path.join(tmpDir, 'test.wg.json');
    fs.writeFileSync(filePath, '{}');

    const result = removeWordgrainFile('test.wg.json', tmpDir);

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('should return error for non-existent file', () => {
    const result = removeWordgrainFile('missing.wg.json', tmpDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
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

  it('should return empty stats for missing directory', () => {
    const stats = getWordgrainStats('/nonexistent/path');

    expect(stats).toEqual({
      totalFiles: 0,
      totalGrains: 0,
      wordCount: 0,
      phraseCount: 0,
      tagCount: 0,
    });
  });

  it('should return empty stats for empty directory', () => {
    const stats = getWordgrainStats(tmpDir);

    expect(stats).toEqual({
      totalFiles: 0,
      totalGrains: 0,
      wordCount: 0,
      phraseCount: 0,
      tagCount: 0,
    });
  });

  it('should compute aggregate stats across files', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'a.wg.json'),
      JSON.stringify({
        name: 'vocab-a',
        grains: [
          { word: 'hello', tags: ['greeting'] },
          { word: 'good morning', tags: ['greeting', 'formal'] },
        ],
      }),
    );
    fs.writeFileSync(
      path.join(tmpDir, 'b.wg.json'),
      JSON.stringify({
        name: 'vocab-b',
        grains: [
          { word: 'world', tags: ['noun'] },
          { word: 'hello' }, // duplicate word
        ],
      }),
    );

    const stats = getWordgrainStats(tmpDir);

    expect(stats.totalFiles).toBe(2);
    expect(stats.totalGrains).toBe(4);
    expect(stats.wordCount).toBe(2); // hello, world (deduplicated)
    expect(stats.phraseCount).toBe(1); // "good morning"
    expect(stats.tagCount).toBe(3); // greeting, formal, noun
  });

  it('should skip malformed files', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.wg.json'), '{ invalid }');
    fs.writeFileSync(
      path.join(tmpDir, 'good.wg.json'),
      JSON.stringify({ name: 'valid', grains: [{ word: 'ok' }] }),
    );

    const stats = getWordgrainStats(tmpDir);

    expect(stats.totalFiles).toBe(1);
    expect(stats.totalGrains).toBe(1);
  });

  it('should handle empty grains in stats', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'empty.wg.json'),
      JSON.stringify({ name: 'empty', grains: [] }),
    );

    const stats = getWordgrainStats(tmpDir);

    expect(stats.totalFiles).toBe(1);
    expect(stats.totalGrains).toBe(0);
    expect(stats.wordCount).toBe(0);
  });
});
