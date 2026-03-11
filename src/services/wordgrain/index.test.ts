import { describe, expect, it, vi } from 'vitest';

vi.mock('./wordgrain-loader.js', () => ({
  loadWordgrainFiles: vi.fn(),
}));

vi.mock('./vocabulary-extractor.js', () => ({
  extractVocabulary: vi.fn(),
}));

import { loadVocabulary } from './index.js';
import { extractVocabulary } from './vocabulary-extractor.js';
import { loadWordgrainFiles } from './wordgrain-loader.js';

const mockLoadFiles = vi.mocked(loadWordgrainFiles);
const mockExtract = vi.mocked(extractVocabulary);

describe('loadVocabulary', () => {
  it('should return null when no valid files loaded', () => {
    mockLoadFiles.mockReturnValue([]);
    expect(loadVocabulary(['/path/test.wg.json'])).toBeNull();
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('should return null when vocabulary is empty', () => {
    mockLoadFiles.mockReturnValue([{ type: 'vocabulary', grains: [], bars: [] }] as never);
    mockExtract.mockReturnValue({ words: [], phrases: [], bars: [] });

    expect(loadVocabulary(['/path/test.wg.json'])).toBeNull();
  });

  it('should return vocabulary when words exist', () => {
    const vocab = { words: [{ word: 'test', pos: 'noun' }], phrases: [], bars: [] };
    mockLoadFiles.mockReturnValue([{ type: 'vocabulary', grains: [], bars: [] }] as never);
    mockExtract.mockReturnValue(vocab as never);

    expect(loadVocabulary(['/path/test.wg.json'])).toBe(vocab);
  });

  it('should return vocabulary when phrases exist', () => {
    const vocab = { words: [], phrases: [{ phrase: 'hello world' }], bars: [] };
    mockLoadFiles.mockReturnValue([{ type: 'vocabulary', grains: [], bars: [] }] as never);
    mockExtract.mockReturnValue(vocab as never);

    expect(loadVocabulary(['/path/test.wg.json'])).toBe(vocab);
  });

  it('should return vocabulary when bars exist', () => {
    const vocab = { words: [], phrases: [], bars: [{ text: '|' }] };
    mockLoadFiles.mockReturnValue([{ type: 'vocabulary', grains: [], bars: [] }] as never);
    mockExtract.mockReturnValue(vocab as never);

    expect(loadVocabulary(['/path/test.wg.json'])).toBe(vocab);
  });
});
