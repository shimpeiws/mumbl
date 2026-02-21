import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext.js';
import { useServices } from '../../context/ServiceContext.js';
import { useConversation } from '../../hooks/useConversation.js';

export function ConversationView() {
  const { switchToList, conversationId } = useNavigation();
  const { entryService, llmService, conversationService } = useServices();
  const [input, setInput] = useState('');

  const { messages, sendMessage, isLoading, error } = useConversation({
    conversationService,
    llmService,
    entryService,
    conversationId,
  });

  useInput((char, key) => {
    if (key.escape) {
      if (conversationService && conversationId) {
        conversationService.archive(conversationId);
      }
      switchToList();
      return;
    }

    if (key.return && !isLoading) {
      const trimmed = input.trim();
      if (trimmed) {
        setInput('');
        void sendMessage(trimmed);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (char && !key.ctrl && !key.meta) {
      setInput((prev) => prev + char);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          Conversation
        </Text>
        {isLoading && (
          <Text color="yellow" dimColor>
            {' '}
            (thinking...)
          </Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {messages.length === 0 && !error && (
          <Text dimColor>Start typing to begin the conversation...</Text>
        )}

        {messages.map((msg) => (
          <Box key={msg.id} marginBottom={1} flexDirection="column">
            <Text bold color={msg.role === 'user' ? 'green' : 'cyan'}>
              {msg.role === 'user' ? 'You' : 'mumbl'}:
            </Text>
            <Box marginLeft={2}>
              <Text wrap="wrap">{msg.content}</Text>
            </Box>
          </Box>
        ))}

        {error && (
          <Box marginBottom={1}>
            <Text color="red">Error: {error}</Text>
          </Box>
        )}
      </Box>

      <Box
        borderStyle="round"
        borderColor="magenta"
        padding={1}
        flexDirection="column"
        minHeight={3}
      >
        <Text>{input || <Text dimColor>Type your message...</Text>}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Enter: send | Esc: end conversation</Text>
      </Box>
    </Box>
  );
}
