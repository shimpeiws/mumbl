/**
 * Load .wg.json files from individual file paths
 */
import * as fs from 'node:fs';
import type { Bar, Grain, GrainPos, WordgrainFile, WordgrainType } from './types.js';

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
 * Validate that a parsed object is a valid Bar
 */
export function isValidBar(obj: unknown): obj is Bar {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  if (typeof record['text'] !== 'string') return false;
  if (
    record['source'] !== undefined &&
    (typeof record['source'] !== 'object' || record['source'] === null)
  )
    return false;
  if (record['language'] !== undefined && typeof record['language'] !== 'string') return false;
  return true;
}

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
  if (record['sentiment'] !== undefined && typeof record['sentiment'] !== 'string') return false;
  if (record['sentiment_score'] !== undefined && typeof record['sentiment_score'] !== 'number')
    return false;
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

    const schemaVersion =
      typeof record['schema_version'] === 'string' ? record['schema_version'] : undefined;
    const fileType = (
      typeof record['type'] === 'string' ? record['type'] : 'grain'
    ) as WordgrainType;

    if (fileType === 'bar') {
      // Bar-only file: entries are in "grains" array but validated as bars
      if (!Array.isArray(record['grains'])) return null;
      const bars: Bar[] = [];
      for (const item of record['grains']) {
        if (isValidBar(item)) {
          bars.push(item);
        }
      }
      return { name, type: 'bar', schemaVersion, grains: [], bars };
    }

    if (fileType === 'mixed') {
      // Mixed file: try both validators per entry
      if (!Array.isArray(record['grains'])) return null;
      const grains: Grain[] = [];
      const bars: Bar[] = [];
      for (const item of record['grains']) {
        if (isValidGrain(item)) {
          grains.push(item);
        } else if (isValidBar(item)) {
          bars.push(item);
        }
      }
      return { name, type: 'mixed', schemaVersion, grains, bars };
    }

    // Default: grain type (v0.1.0 or explicit grain)
    if (!Array.isArray(record['grains'])) return null;
    const grains: Grain[] = [];
    for (const item of record['grains']) {
      if (isValidGrain(item)) {
        grains.push(item);
      }
    }

    // v0.2.0: also read top-level "bars" array if present
    const bars: Bar[] = [];
    if (Array.isArray(record['bars'])) {
      for (const item of record['bars']) {
        if (isValidBar(item)) {
          bars.push(item);
        }
      }
    }

    const resolvedType: WordgrainType =
      bars.length > 0 && grains.length > 0 ? 'mixed' : bars.length > 0 ? 'bar' : 'grain';

    return { name, type: resolvedType, schemaVersion, grains, bars };
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
