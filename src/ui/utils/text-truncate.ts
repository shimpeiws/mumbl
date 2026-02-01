/**
 * Truncates text to fit within a given width
 * Adds ellipsis if truncated
 */
export function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  if (text.length <= maxWidth) {
    return text;
  }

  if (maxWidth <= 3) {
    return text.slice(0, maxWidth);
  }

  return `${text.slice(0, maxWidth - 3)}...`;
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
