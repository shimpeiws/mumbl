import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext.js';

export function AddFileView() {
  const { setFile, setSubMode, error, clearError } = useConfig();
  const [inputPath, setInputPath] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      clearError();
      setSubMode('normal');
      return;
    }

    if (key.return) {
      const trimmed = inputPath.trim();
      if (trimmed) {
        setFile(trimmed);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInputPath((prev) => prev.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setInputPath((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">
          Set Wordgrain File
        </Text>
      </Box>

      <Box>
        <Text>Path: </Text>
        <Text>{inputPath || <Text dimColor>Enter path to .wg.json file...</Text>}</Text>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Enter: set | Esc: cancel</Text>
      </Box>
    </Box>
  );
}
