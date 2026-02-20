import { Box, Text, useInput } from 'ink';
import React from 'react';
import { useNavigation } from '../../context/NavigationContext.js';
import { useServices } from '../../context/ServiceContext.js';

export function WriteView() {
  const { switchToList, writeState, setWriteState } = useNavigation();
  const { entryService } = useServices();

  useInput((input, key) => {
    if (key.escape) {
      switchToList();
      return;
    }

    if (key.tab) {
      switchToList();
      return;
    }

    // Save entry on Enter (only if content is not empty)
    if (key.return) {
      const trimmedContent = writeState.content.trim();
      if (trimmedContent) {
        entryService.create({ content: trimmedContent });
        setWriteState({ content: '' });
        switchToList({ selectLastEntry: true });
      }
      return;
    }

    // Basic text input handling
    if (key.backspace || key.delete) {
      setWriteState({ content: writeState.content.slice(0, -1) });
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setWriteState({ content: writeState.content + input });
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          New Entry
        </Text>
      </Box>

      <Box borderStyle="round" borderColor="green" padding={1} flexDirection="column" minHeight={5}>
        <Text>{writeState.content || <Text dimColor>Start typing...</Text>}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Characters: {writeState.content.length}</Text>
      </Box>
    </Box>
  );
}
