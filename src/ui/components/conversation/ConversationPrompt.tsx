import { Box, Text, useInput } from 'ink';
import React from 'react';

interface ConversationPromptProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConversationPrompt({ onAccept, onDecline }: ConversationPromptProps) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onAccept();
      return;
    }
    if (input === 'n' || input === 'N' || key.escape) {
      onDecline();
      return;
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginTop={1}>
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          Looks like you have something on your mind.
        </Text>
      </Box>
      <Text>Want to talk about it?</Text>
      <Box marginTop={1}>
        <Text dimColor>y: start conversation | n: back to list</Text>
      </Box>
    </Box>
  );
}
