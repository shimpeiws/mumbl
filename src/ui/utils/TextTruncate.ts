import stringWidth from 'string-width';

/**
 * Gets the display width of a string (full-width chars = 2, half-width = 1)
 */
export function getDisplayWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Truncates text to fit within a given display width
 * Accounts for full-width characters (Japanese, Chinese, etc.)
 * Adds ellipsis if truncated
 */
export function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  const textWidth = stringWidth(text);
  if (textWidth <= maxWidth) {
    return text;
  }

  if (maxWidth <= 3) {
    return truncateToWidth(text, maxWidth);
  }

  return `${truncateToWidth(text, maxWidth - 3)}...`;
}

/**
 * Truncates text to fit within a given display width
 * Returns the longest prefix that fits within maxWidth
 */
function truncateToWidth(text: string, maxWidth: number): string {
  let currentWidth = 0;
  let result = '';

  for (const char of text) {
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth > maxWidth) {
      break;
    }
    currentWidth += charWidth;
    result += char;
  }

  return result;
}

/**
 * Gets the first non-empty line of content
 * Skips empty lines and common markdown prefixes
 */
export function getFirstLine(content: string): string {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Skip markdown headers (but include the text)
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '');
      if (headerText) {
        return headerText;
      }
      continue;
    }

    // Skip horizontal rules
    if (/^[-*_]{3,}$/.test(trimmed)) {
      continue;
    }

    return trimmed;
  }

  return '';
}

/**
 * Gets a preview line from content, truncated to fit width
 */
export function getPreviewLine(content: string, maxWidth: number): string {
  const firstLine = getFirstLine(content);

  if (!firstLine) {
    return '(empty)';
  }

  return truncateText(firstLine, maxWidth);
}
