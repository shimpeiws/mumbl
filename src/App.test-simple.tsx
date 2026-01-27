import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

export const App = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        mumbl - AI-powered communication tool
      </Text>
      <Text>Counter: {count}</Text>
      <Text dimColor>Press CTRL+C to exit</Text>
    </Box>
  );
};
