import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { detectConversationTrigger } from '../../../services/conversation/trigger-detector.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useServices } from '../../context/ServiceContext.js';
import { ConversationPrompt } from '../conversation/ConversationPrompt.js';

export function WriteView() {
  const { switchToList, switchToConversation, writeState, setWriteState } = useNavigation();
  const { entryService, conversationService } = useServices();
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingContent, setPendingContent] = useState('');

  useInput((input, key) => {
    if (showPrompt) {
      return;
    }

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

        if (conversationService && detectConversationTrigger(trimmedContent)) {
          setPendingContent(trimmedContent);
          setShowPrompt(true);
          return;
        }

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

  const handleAcceptConversation = () => {
    if (!conversationService) {
      setShowPrompt(false);
      switchToList({ selectLastEntry: true });
      return;
    }

    const conversation = conversationService.startConversation();
    const entry = entryService.create({ content: pendingContent });
    conversationService.addEntry(conversation.id, entry.id, pendingContent);
    setShowPrompt(false);
    setPendingContent('');
    switchToConversation(conversation.id);
  };

  const handleDeclineConversation = () => {
    setShowPrompt(false);
    setPendingContent('');
    switchToList({ selectLastEntry: true });
  };

  if (showPrompt) {
    return (
      <Box flexDirection="column" padding={1}>
        <ConversationPrompt
          onAccept={handleAcceptConversation}
          onDecline={handleDeclineConversation}
        />
      </Box>
    );
  }

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
