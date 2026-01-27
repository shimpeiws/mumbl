import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';

export const App = () => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          mumbl - AI-powered communication tool
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Press 'q' or CTRL+C to exit</Text>
      </Box>
      <Box>
        <Text dimColor>Status: Ready</Text>
      </Box>
    </Box>
  );
};
