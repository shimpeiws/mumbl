import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadWordgrainDir } from './wordgrain-loader.js';

describe('loadWordgrainDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wg-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load valid .wg.json files', () => {
    const fileContent = JSON.stringify({
      name: 'test-rapper',
      grains: [
        { word: 'drip', tags: ['style'] },
        { word: 'go hard', context: 'motivation' },
      ],
    });
    fs.writeFileSync(path.join(tmpDir, 'test.wg.json'), fileContent);

    const result = loadWordgrainDir(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('test-rapper');
    expect(result[0]?.grains).toHaveLength(2);
    expect(result[0]?.grains[0]?.word).toBe('drip');
    expect(result[0]?.grains[0]?.tags).toEqual(['style']);
    expect(result[0]?.grains[1]?.word).toBe('go hard');
    expect(result[0]?.grains[1]?.context).toBe('motivation');
  });

  it('should return empty array for missing directory', () => {
    const result = loadWordgrainDir('/nonexistent/path');
    expect(result).toEqual([]);
  });

  it('should return empty array for empty directory', () => {
    const result = loadWordgrainDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('should skip malformed JSON files', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.wg.json'), '{ invalid json }');
    fs.writeFileSync(
      path.join(tmpDir, 'good.wg.json'),
      JSON.stringify({ name: 'valid', grains: [{ word: 'fire' }] }),
    );

    const result = loadWordgrainDir(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('valid');
  });

  it('should skip files without .wg.json extension', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'not-wg.json'),
      JSON.stringify({ name: 'skip', grains: [{ word: 'skip' }] }),
    );

    const result = loadWordgrainDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('should skip files with missing name field', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'no-name.wg.json'),
      JSON.stringify({ grains: [{ word: 'test' }] }),
    );

    const result = loadWordgrainDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('should skip files with missing grains array', () => {
    fs.writeFileSync(path.join(tmpDir, 'no-grains.wg.json'), JSON.stringify({ name: 'test' }));

    const result = loadWordgrainDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('should skip invalid grains within a valid file', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'mixed.wg.json'),
      JSON.stringify({
        name: 'mixed',
        grains: [{ word: 'valid' }, { notAWord: 'invalid' }, 42, null, { word: 'also-valid' }],
      }),
    );

    const result = loadWordgrainDir(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.grains).toHaveLength(2);
    expect(result[0]?.grains[0]?.word).toBe('valid');
    expect(result[0]?.grains[1]?.word).toBe('also-valid');
  });

  it('should load multiple .wg.json files', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'a.wg.json'),
      JSON.stringify({ name: 'rapper-a', grains: [{ word: 'flex' }] }),
    );
    fs.writeFileSync(
      path.join(tmpDir, 'b.wg.json'),
      JSON.stringify({ name: 'rapper-b', grains: [{ word: 'bars' }] }),
    );

    const result = loadWordgrainDir(tmpDir);

    expect(result).toHaveLength(2);
    const names = result.map((f) => f.name).sort();
    expect(names).toEqual(['rapper-a', 'rapper-b']);
  });

  it('should return empty array when path is a file not a directory', () => {
    const filePath = path.join(tmpDir, 'not-a-dir');
    fs.writeFileSync(filePath, 'hello');

    const result = loadWordgrainDir(filePath);
    expect(result).toEqual([]);
  });

  it('should load barscan format files with meta.artist', () => {
    const fileContent = JSON.stringify({
      meta: { artist: 'barscan-artist' },
      grains: [{ word: 'flow', tags: ['style'] }],
    });
    fs.writeFileSync(path.join(tmpDir, 'barscan.wg.json'), fileContent);

    const result = loadWordgrainDir(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('barscan-artist');
    expect(result[0]?.grains).toHaveLength(1);
    expect(result[0]?.grains[0]?.word).toBe('flow');
  });

  it('should skip files with neither name nor meta.artist', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'no-name-no-meta.wg.json'),
      JSON.stringify({ grains: [{ word: 'test' }] }),
    );

    const result = loadWordgrainDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('should prefer top-level name over meta.artist', () => {
    const fileContent = JSON.stringify({
      name: 'top-level-name',
      meta: { artist: 'meta-artist' },
      grains: [{ word: 'bars' }],
    });
    fs.writeFileSync(path.join(tmpDir, 'both.wg.json'), fileContent);

    const result = loadWordgrainDir(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('top-level-name');
  });
});
