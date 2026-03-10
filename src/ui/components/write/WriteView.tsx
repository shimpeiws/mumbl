import { Box, Text, useInput } from 'ink';
import React from 'react';
import { useNavigation } from '../../context/NavigationContext.js';
import { useServices } from '../../context/ServiceContext.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';

export function WriteView() {
  const { switchToList, writeState, setWriteState } = useNavigation();
  const { entryService } = useServices();
  const { rows: terminalRows } = useTerminalSize();

  // Calculate text input height: terminal rows minus all non-input UI lines.
  // Overhead (17 lines):
  //   App header:  padding-top(1) + content(1) + padding-bottom(1) + marginBottom(1) = 4
  //   WriteView:   padding-top(1) + "New Entry" title(1) + marginBottom(1) + padding-bottom(1) = 4
  //   Text input:  borderTop(1) + padding-top(1) + padding-bottom(1) + borderBottom(1) = 4
  //   Char count:  marginTop(1) + content(1) = 2
  //   Footer:      marginTop(1) + content(1) = 2
  //   Buffer:      1
  const textInputHeight = Math.max(3, terminalRows - 17);

  useInput((input, key) => {
    if (key.escape) {
      switchToList();
      return;
    }

    if (key.tab) {
      switchToList();
      return;
    }

    if (key.return) {
      const trimmedContent = writeState.content.trim();
      if (trimmedContent) {
        entryService.create({ content: trimmedContent });
        setWriteState({ content: '' });
        switchToList({ selectLastEntry: true });
      }
      return;
    }

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

      <Box
        borderStyle="round"
        borderColor="green"
        padding={1}
        flexDirection="column"
        height={textInputHeight}
      >
        <Text>{writeState.content || <Text dimColor>Start typing...</Text>}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Characters: {writeState.content.length}</Text>
      </Box>
    </Box>
  );
}
