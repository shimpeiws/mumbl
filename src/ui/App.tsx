import { Box, Text, useApp, useInput } from 'ink';
import React from 'react';
import { EntryList } from './components/entries/EntryList.js';

export const App = () => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1}>
        <Text bold color="cyan">
          mumbl
        </Text>
        <Text dimColor> - AI-powered communication tool</Text>
      </Box>
      <EntryList />
    </Box>
  );
};
