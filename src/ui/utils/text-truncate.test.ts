import { describe, expect, it } from 'vitest';
import { getDisplayWidth, getFirstLine, getPreviewLine, truncateText } from './text-truncate.js';

describe('getDisplayWidth', () => {
  it('should return correct width for ASCII characters', () => {
    expect(getDisplayWidth('hello')).toBe(5);
    expect(getDisplayWidth('Hello World')).toBe(11);
  });

  it('should return correct width for full-width characters', () => {
    // Japanese characters are 2 columns each
    expect(getDisplayWidth('こんにちは')).toBe(10);
    expect(getDisplayWidth('日本語')).toBe(6);
  });

  it('should return correct width for mixed content', () => {
    // "Hi " (3) + "日本" (4) = 7
    expect(getDisplayWidth('Hi 日本')).toBe(7);
    // "Hello" (5) + "こんにちは" (10) = 15
    expect(getDisplayWidth('Helloこんにちは')).toBe(15);
  });

  it('should return 0 for empty string', () => {
    expect(getDisplayWidth('')).toBe(0);
  });
});

describe('truncateText', () => {
  it('should return empty string for maxWidth <= 0', () => {
    expect(truncateText('hello', 0)).toBe('');
    expect(truncateText('hello', -1)).toBe('');
  });

  it('should return text unchanged if shorter than maxWidth', () => {
    expect(truncateText('hello', 10)).toBe('hello');
    expect(truncateText('hello', 5)).toBe('hello');
  });

  it('should truncate text and add ellipsis', () => {
    expect(truncateText('hello world', 8)).toBe('hello...');
  });

  it('should handle maxWidth <= 3 without ellipsis', () => {
    expect(truncateText('hello', 3)).toBe('hel');
    expect(truncateText('hello', 2)).toBe('he');
    expect(truncateText('hello', 1)).toBe('h');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('should truncate full-width characters by display width', () => {
    // "こんにちは" = 10 columns, truncate to 8 columns = "こんに" (6) + "..." (3) = 9 > 8
    // So we need "こん" (4) + "..." (3) = 7, or fit within 8
    // Actually: maxWidth 8, need 3 for ellipsis, so 5 columns for text
    // "こん" = 4 columns, fits. "こんに" = 6 columns, doesn't fit.
    expect(truncateText('こんにちは', 8)).toBe('こん...');
  });

  it('should not truncate full-width text that fits', () => {
    // "日本語" = 6 columns
    expect(truncateText('日本語', 10)).toBe('日本語');
    expect(truncateText('日本語', 6)).toBe('日本語');
  });

  it('should handle mixed content truncation', () => {
    // "Hello日本語" = 5 + 6 = 11 columns
    // Truncate to 10: need 7 for content + 3 for "..."
    // "Hello日" = 5 + 2 = 7 columns
    expect(truncateText('Hello日本語', 10)).toBe('Hello日...');
  });
});

describe('getFirstLine', () => {
  it('should return first non-empty line', () => {
    expect(getFirstLine('hello world')).toBe('hello world');
    expect(getFirstLine('\n\nhello world')).toBe('hello world');
    expect(getFirstLine('  \n  \nhello world')).toBe('hello world');
  });

  it('should extract text from markdown headers', () => {
    expect(getFirstLine('# Header')).toBe('Header');
    expect(getFirstLine('## Sub Header')).toBe('Sub Header');
    expect(getFirstLine('### Deep Header')).toBe('Deep Header');
  });

  it('should skip horizontal rules', () => {
    expect(getFirstLine('---\nhello')).toBe('hello');
    expect(getFirstLine('***\nhello')).toBe('hello');
    expect(getFirstLine('___\nhello')).toBe('hello');
  });

  it('should return empty string for empty content', () => {
    expect(getFirstLine('')).toBe('');
    expect(getFirstLine('\n\n')).toBe('');
    expect(getFirstLine('   ')).toBe('');
  });

  it('should skip empty markdown headers', () => {
    expect(getFirstLine('#\n## \n### Real content')).toBe('Real content');
  });
});

describe('getPreviewLine', () => {
  it('should return truncated first line', () => {
    const content = 'This is a very long line that needs truncation';
    expect(getPreviewLine(content, 20)).toBe('This is a very lo...');
  });

  it('should return "(empty)" for empty content', () => {
    expect(getPreviewLine('', 20)).toBe('(empty)');
    expect(getPreviewLine('\n\n', 20)).toBe('(empty)');
  });

  it('should handle content shorter than maxWidth', () => {
    expect(getPreviewLine('Short', 20)).toBe('Short');
  });

  it('should extract from markdown and truncate', () => {
    const content = '# A Very Long Markdown Header That Needs Truncation';
    expect(getPreviewLine(content, 25)).toBe('A Very Long Markdown H...');
  });
});
