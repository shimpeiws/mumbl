/**
 * Load .wg.json files from individual file paths
 */
import * as fs from 'node:fs';
import type { Grain, GrainPos, WordgrainFile } from './types.js';

const VALID_POS_VALUES: ReadonlySet<string> = new Set<GrainPos>([
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
]);

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
  if (record['pos'] !== undefined) {
    if (typeof record['pos'] !== 'string' || !VALID_POS_VALUES.has(record['pos'])) return false;
  }
  if (record['frequency'] !== undefined) {
    if (typeof record['frequency'] !== 'number' || record['frequency'] < 0) return false;
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
 * Load wordgrain files from individual file paths
 * @param filePaths - Array of paths to .wg.json files
 * @returns Array of parsed WordgrainFile objects
 */
export function loadWordgrainFiles(filePaths: string[]): WordgrainFile[] {
  const results: WordgrainFile[] = [];

  for (const filePath of filePaths) {
    try {
      const parsed = parseWordgrainFile(filePath);
      if (parsed) {
        results.push(parsed);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return results;
}
