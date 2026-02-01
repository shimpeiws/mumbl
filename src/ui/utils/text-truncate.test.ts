import { describe, expect, it } from 'vitest';
import { getFirstLine, getPreviewLine, truncateText } from './text-truncate.js';

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
