import { Box, Text } from 'ink';
import React from 'react';

interface EntryGroupHeaderProps {
  groupName: string;
  entryCount: number;
  maxWidth?: number;
}

export function EntryGroupHeader({ groupName, entryCount, maxWidth = 60 }: EntryGroupHeaderProps) {
  const prefixLength = 4 + groupName.length + 3 + String(entryCount).length + 2;
  const separatorLength = Math.max(3, maxWidth - prefixLength);

  return (
    <Box marginY={1}>
      <Text dimColor>--- </Text>
      <Text color="yellow" bold>
        {groupName}
      </Text>
      <Text dimColor> ({entryCount}) </Text>
      <Text dimColor>{'─'.repeat(separatorLength)}</Text>
    </Box>
  );
}
