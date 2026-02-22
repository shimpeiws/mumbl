/**
 * Wordgrain file management operations
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseWordgrainFile } from './wordgrain-loader.js';

export interface WordgrainFileInfo {
  filename: string;
  name: string;
  grainCount: number;
}

export interface WordgrainStats {
  totalFiles: number;
  totalGrains: number;
  wordCount: number;
  phraseCount: number;
  tagCount: number;
}

/**
 * List all .wg.json files in the directory with metadata
 */
export function listWordgrainFiles(dirPath: string): WordgrainFileInfo[] {
  try {
    if (!fs.existsSync(dirPath)) return [];
    if (!fs.statSync(dirPath).isDirectory()) return [];

    const entries = fs.readdirSync(dirPath);
    const results: WordgrainFileInfo[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.wg.json')) continue;
      const filePath = path.join(dirPath, entry);
      const parsed = parseWordgrainFile(filePath);
      if (parsed) {
        results.push({
          filename: entry,
          name: parsed.name,
          grainCount: parsed.grains.length,
        });
      }
    }

    return results.sort((a, b) => a.filename.localeCompare(b.filename));
  } catch {
    return [];
  }
}

/**
 * Add a .wg.json file to the wordgrain directory by copying from source path
 */
export function addWordgrainFile(
  sourcePath: string,
  dirPath: string,
): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Source file does not exist' };
    }

    if (!fs.statSync(sourcePath).isFile()) {
      return { success: false, error: 'Source path is not a file' };
    }

    if (!sourcePath.endsWith('.wg.json')) {
      return { success: false, error: 'File must have .wg.json extension' };
    }

    // Validate the file is a valid wordgrain file
    const parsed = parseWordgrainFile(sourcePath);
    if (!parsed) {
      return { success: false, error: 'Invalid wordgrain file format' };
    }

    // Ensure target directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filename = path.basename(sourcePath);
    const targetPath = path.join(dirPath, filename);

    if (fs.existsSync(targetPath)) {
      return { success: false, error: `File "${filename}" already exists in wordgrain directory` };
    }

    fs.copyFileSync(sourcePath, targetPath);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Remove a .wg.json file from the wordgrain directory
 */
export function removeWordgrainFile(
  filename: string,
  dirPath: string,
): { success: boolean; error?: string } {
  try {
    const filePath = path.join(dirPath, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File "${filename}" not found` };
    }

    fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Compute aggregate statistics for all wordgrain files in the directory
 */
export function getWordgrainStats(dirPath: string): WordgrainStats {
  const empty: WordgrainStats = {
    totalFiles: 0,
    totalGrains: 0,
    wordCount: 0,
    phraseCount: 0,
    tagCount: 0,
  };

  try {
    if (!fs.existsSync(dirPath)) return empty;
    if (!fs.statSync(dirPath).isDirectory()) return empty;

    const entries = fs.readdirSync(dirPath);
    let totalFiles = 0;
    let totalGrains = 0;
    const wordSet = new Set<string>();
    const phraseSet = new Set<string>();
    const tagSet = new Set<string>();

    for (const entry of entries) {
      if (!entry.endsWith('.wg.json')) continue;
      const filePath = path.join(dirPath, entry);
      const parsed = parseWordgrainFile(filePath);
      if (!parsed) continue;

      totalFiles++;
      totalGrains += parsed.grains.length;

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
    };
  } catch {
    return empty;
  }
}
