import { Box, Text } from 'ink';
import React from 'react';

interface EntryGroupHeaderProps {
  groupName: string;
  entryCount: number;
}

export function EntryGroupHeader({ groupName, entryCount }: EntryGroupHeaderProps) {
  return (
    <Box marginY={1}>
      <Text dimColor>--- </Text>
      <Text color="yellow" bold>
        {groupName}
      </Text>
      <Text dimColor> ({entryCount}) </Text>
      <Text dimColor>{'─'.repeat(30)}</Text>
    </Box>
  );
}
