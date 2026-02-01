import { Box, Text } from 'ink';
import React from 'react';

export function EmptyState() {
  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Text color="gray">No entries yet</Text>
      <Box marginTop={1}>
        <Text dimColor>Start journaling by creating your first entry.</Text>
      </Box>
    </Box>
  );
}
