import { Box, Text } from 'ink';
import React from 'react';
import type { JournalEntry, Reaction } from '../../../repositories/types.js';
import { formatEntryTimestamp } from '../../utils/date-formatter.js';
import { getDisplayWidth, getPreviewLine } from '../../utils/text-truncate.js';

interface EntryListItemProps {
  entry: JournalEntry;
  isSelected: boolean;
  maxWidth?: number;
  reaction?: Reaction;
}

export function formatReactionDisplay(reaction: Reaction): string {
  switch (reaction.reactionType) {
    case 'read':
      return '·';
    case 'heard':
      return 'hearing you';
    case 'thinking':
      return `💭 ${reaction.content}`;
    case 'with-you':
    case 'custom':
      return reaction.content;
    default:
      return reaction.content;
  }
}

export function EntryListItem({ entry, isSelected, maxWidth = 60, reaction }: EntryListItemProps) {
  const timestamp = formatEntryTimestamp(entry.timestamp);
  const timestampWidth = timestamp.length + 1; // +1 for space before timestamp
  const contentWidth = Math.max(10, maxWidth - timestampWidth - 2); // 2 for cursor "> "
  const preview = getPreviewLine(entry.content, contentWidth);

  // Calculate padding between content and timestamp using display width
  const paddingLength = Math.max(1, maxWidth - 2 - getDisplayWidth(preview) - timestamp.length);
  const padding = ' '.repeat(paddingLength);

  return (
    <Box flexDirection="column">
      {/* First line: cursor + content + timestamp */}
      <Box>
        <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '> ' : '  '}</Text>
        <Text color={isSelected ? 'white' : undefined} bold={isSelected}>
          {preview}
        </Text>
        <Text>{padding}</Text>
        <Text dimColor>{timestamp}</Text>
      </Box>
      {/* Second line: reaction area (always rendered to prevent layout shift) */}
      <Box>
        <Text>{'  '}</Text>
        <Text dimColor>{reaction ? formatReactionDisplay(reaction) : ' '}</Text>
      </Box>
    </Box>
  );
}
