import { Box, Text, useInput } from 'ink';
import React from 'react';
import { useConfig } from '../../context/ConfigContext.js';

export function DeleteConfirm() {
  const { files, selectedFileIndex, removeFile, setSubMode } = useConfig();
  const file = files[selectedFileIndex];

  useInput((input, key) => {
    if (input === 'y' && file) {
      removeFile(file.filename);
      return;
    }

    if (input === 'n' || key.escape) {
      setSubMode('normal');
      return;
    }
  });

  if (!file) {
    setSubMode('normal');
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="red">
          Unregister Wordgrain File
        </Text>
      </Box>

      <Text>
        Unregister <Text bold>{file.filename}</Text> ({file.name},{' '}
        {file.barCount > 0 ? `${file.barCount} bars` : `${file.grainCount} grains`})?
      </Text>

      <Box marginTop={1}>
        <Text dimColor>y: confirm | n/Esc: cancel</Text>
      </Box>
    </Box>
  );
}
