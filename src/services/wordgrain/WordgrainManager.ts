/**
 * Wordgrain file management operations
 *
 * Manages a single wordgrain file path.
 * The file is referenced in-place and not copied.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseWordgrainFile } from './WordgrainLoader.js';

export interface WordgrainFileInfo {
  filename: string;
  name: string;
  grainCount: number;
  barCount: number;
  type?: string;
}

export interface WordgrainStats {
  totalGrains: number;
  wordCount: number;
  phraseCount: number;
  tagCount: number;
  barCount: number;
}

/**
 * Get metadata for a registered wordgrain file
 */
export function getWordgrainFileInfo(filePath: string): WordgrainFileInfo | null {
  try {
    const parsed = parseWordgrainFile(filePath);
    if (!parsed) return null;

    return {
      filename: path.basename(filePath),
      name: parsed.name,
      grainCount: parsed.grains.length,
      barCount: parsed.bars.length,
      type: parsed.type,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a file path for registration as a wordgrain file.
 * Does not copy the file; only checks existence and format.
 */
export function validateWordgrainFile(filePath: string): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }

    if (!fs.statSync(filePath).isFile()) {
      return { success: false, error: 'Path is not a file' };
    }

    if (!filePath.endsWith('.wg.json')) {
      return { success: false, error: 'File must have .wg.json extension' };
    }

    // Validate the file is a valid wordgrain file
    const parsed = parseWordgrainFile(filePath);
    if (!parsed) {
      return { success: false, error: 'Invalid wordgrain file format' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Compute statistics for a wordgrain file
 */
export function getWordgrainStats(filePath: string): WordgrainStats {
  const empty: WordgrainStats = {
    totalGrains: 0,
    wordCount: 0,
    phraseCount: 0,
    tagCount: 0,
    barCount: 0,
  };

  try {
    const parsed = parseWordgrainFile(filePath);
    if (!parsed) return empty;

    const wordSet = new Set<string>();
    const phraseSet = new Set<string>();
    const tagSet = new Set<string>();

    for (const grain of parsed.grains) {
      const trimmed = grain.word.trim();
      if (!trimmed) continue;

      if (trimmed.includes(' ')) {
        phraseSet.add(trimmed);
      } else {
        wordSet.add(trimmed);
      }

      if (grain.tags) {
        for (const tag of grain.tags) {
          const trimmedTag = tag.trim();
          if (trimmedTag) tagSet.add(trimmedTag);
        }
      }
    }

    return {
      totalGrains: parsed.grains.length,
      wordCount: wordSet.size,
      phraseCount: phraseSet.size,
      tagCount: tagSet.size,
      barCount: parsed.bars.length,
    };
  } catch {
    return empty;
  }
}
