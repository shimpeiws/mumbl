import { describe, expect, it, vi } from 'vitest';

vi.mock('./WordgrainLoader.js', () => ({
  parseWordgrainFile: vi.fn(),
}));

vi.mock('./VocabularyExtractor.js', () => ({
  extractVocabulary: vi.fn(),
}));

import { extractVocabulary } from './VocabularyExtractor.js';
import { parseWordgrainFile } from './WordgrainLoader.js';
import { loadVocabulary } from './index.js';

const mockParseFile = vi.mocked(parseWordgrainFile);
const mockExtract = vi.mocked(extractVocabulary);

describe('loadVocabulary', () => {
  it('should return null when file is invalid', () => {
    mockParseFile.mockReturnValue(null);
    expect(loadVocabulary('/path/test.wg.json')).toBeNull();
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('should return null when vocabulary is empty', () => {
    mockParseFile.mockReturnValue({ type: 'vocabulary', grains: [], bars: [] } as never);
    mockExtract.mockReturnValue({ words: [], phrases: [], bars: [] });

    expect(loadVocabulary('/path/test.wg.json')).toBeNull();
  });

  it('should return vocabulary when words exist', () => {
    const vocab = { words: [{ word: 'test', pos: 'noun' }], phrases: [], bars: [] };
    mockParseFile.mockReturnValue({ type: 'vocabulary', grains: [], bars: [] } as never);
    mockExtract.mockReturnValue(vocab as never);

    expect(loadVocabulary('/path/test.wg.json')).toBe(vocab);
  });

  it('should return vocabulary when phrases exist', () => {
    const vocab = { words: [], phrases: [{ phrase: 'hello world' }], bars: [] };
    mockParseFile.mockReturnValue({ type: 'vocabulary', grains: [], bars: [] } as never);
    mockExtract.mockReturnValue(vocab as never);

    expect(loadVocabulary('/path/test.wg.json')).toBe(vocab);
  });

  it('should return vocabulary when bars exist', () => {
    const vocab = { words: [], phrases: [], bars: [{ text: '|' }] };
    mockParseFile.mockReturnValue({ type: 'vocabulary', grains: [], bars: [] } as never);
    mockExtract.mockReturnValue(vocab as never);

    expect(loadVocabulary('/path/test.wg.json')).toBe(vocab);
  });
});
