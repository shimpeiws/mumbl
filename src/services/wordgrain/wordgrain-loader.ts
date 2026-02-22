/**
 * Load .wg.json files from a directory
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Grain, WordgrainFile } from './types.js';

/**
 * Validate that a parsed object is a valid Grain
 */
function isValidGrain(obj: unknown): obj is Grain {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  if (typeof record['word'] !== 'string') return false;
  if (record['context'] !== undefined && typeof record['context'] !== 'string') return false;
  if (record['tags'] !== undefined) {
    if (!Array.isArray(record['tags'])) return false;
    if (!record['tags'].every((t: unknown) => typeof t === 'string')) return false;
  }
  return true;
}

/**
 * Parse a single .wg.json file
 */
export function parseWordgrainFile(filePath: string): WordgrainFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;

    const meta = record['meta'] as Record<string, unknown> | undefined;
    const name =
      typeof record['name'] === 'string'
        ? record['name']
        : meta && typeof meta['artist'] === 'string'
          ? meta['artist']
          : null;
    if (!name) return null;
    if (!Array.isArray(record['grains'])) return null;

    const grains: Grain[] = [];
    for (const item of record['grains']) {
      if (isValidGrain(item)) {
        grains.push(item);
      }
    }

    return { name, grains };
  } catch {
    return null;
  }
}

/**
 * Load all .wg.json files from a directory
 * @param dirPath - Path to directory containing .wg.json files
 * @returns Array of parsed WordgrainFile objects
 */
export function loadWordgrainDir(dirPath: string): WordgrainFile[] {
  try {
    if (!fs.existsSync(dirPath)) return [];
    if (!fs.statSync(dirPath).isDirectory()) return [];

    const entries = fs.readdirSync(dirPath);
    const results: WordgrainFile[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.wg.json')) continue;
      const filePath = path.join(dirPath, entry);
      const parsed = parseWordgrainFile(filePath);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  } catch {
    return [];
  }
}
