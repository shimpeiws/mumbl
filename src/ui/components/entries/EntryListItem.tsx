import { Box, Text } from 'ink';
import React from 'react';
import type { JournalEntry } from '../../../repositories/types.js';
import { formatEntryTimestamp } from '../../utils/date-formatter.js';
import { getPreviewLine } from '../../utils/text-truncate.js';

interface EntryListItemProps {
  entry: JournalEntry;
  isSelected: boolean;
  maxWidth?: number;
}

export function EntryListItem({ entry, isSelected, maxWidth = 60 }: EntryListItemProps) {
  const timestamp = formatEntryTimestamp(entry.timestamp);
  const timestampWidth = timestamp.length + 3; // brackets + space
  const contentWidth = Math.max(10, maxWidth - timestampWidth - 2); // 2 for cursor
  const preview = getPreviewLine(entry.content, contentWidth);

  return (
    <Box>
      <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '> ' : '  '}</Text>
      <Text color="gray">[{timestamp}]</Text>
      <Text> </Text>
      <Text color={isSelected ? 'white' : undefined} bold={isSelected}>
        {preview}
      </Text>
    </Box>
  );
}
