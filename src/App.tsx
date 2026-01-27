import { Box, Text, useApp, useInput } from 'ink';
import React, { useEffect, useState } from 'react';

export const App = () => {
  const { exit } = useApp();
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
        <Text dimColor>Status: Ready (uptime: {uptime}s)</Text>
      </Box>
    </Box>
  );
};
