/**
 * Wordgrain file management operations
 *
 * Manages individual file paths instead of a directory.
 * Files are referenced in-place and not copied.
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
  totalFiles: number;
  totalGrains: number;
  wordCount: number;
  phraseCount: number;
  tagCount: number;
  barCount: number;
}

/**
 * List registered wordgrain files with metadata
 */
export function listWordgrainFiles(filePaths: string[]): WordgrainFileInfo[] {
  const results: WordgrainFileInfo[] = [];

  for (const filePath of filePaths) {
    try {
      const parsed = parseWordgrainFile(filePath);
      if (parsed) {
        results.push({
          filename: path.basename(filePath),
          name: parsed.name,
          grainCount: parsed.grains.length,
          barCount: parsed.bars.length,
          type: parsed.type,
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return results.sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Validate a file path for registration as a wordgrain file.
 * Does not copy the file; only checks existence and format.
 */
export function registerWordgrainFile(
  filePath: string,
  existingPaths: string[],
): { success: boolean; error?: string } {
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

    // Check for duplicate registration
    const resolved = path.resolve(filePath);
    if (existingPaths.some((p) => path.resolve(p) === resolved)) {
      return { success: false, error: 'File is already registered' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Compute aggregate statistics for registered wordgrain files
 */
export function getWordgrainStats(filePaths: string[]): WordgrainStats {
  const empty: WordgrainStats = {
    totalFiles: 0,
    totalGrains: 0,
    wordCount: 0,
    phraseCount: 0,
    tagCount: 0,
    barCount: 0,
  };

  try {
    let totalFiles = 0;
    let totalGrains = 0;
    let totalBars = 0;
    const wordSet = new Set<string>();
    const phraseSet = new Set<string>();
    const tagSet = new Set<string>();

    for (const filePath of filePaths) {
      const parsed = parseWordgrainFile(filePath);
      if (!parsed) continue;

      totalFiles++;
      totalGrains += parsed.grains.length;
      totalBars += parsed.bars.length;

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
    }

    return {
      totalFiles,
      totalGrains,
      wordCount: wordSet.size,
      phraseCount: phraseSet.size,
      tagCount: tagSet.size,
      barCount: totalBars,
    };
  } catch {
    return empty;
  }
}
