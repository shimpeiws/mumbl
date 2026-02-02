import { Box, Text } from 'ink';
import React from 'react';
import type { AppMode } from '../../context/NavigationContext.js';

interface HelpFooterProps {
  mode: AppMode;
  isViewingDetail?: boolean;
}

export function HelpFooter({ mode, isViewingDetail = false }: HelpFooterProps) {
  const getShortcuts = () => {
    if (mode === 'write') {
      return 'Tab: list | Esc: cancel | q: quit';
    }
    if (isViewingDetail) {
      return 'Esc/q: back | Tab: write';
    }
    return 'j/k: navigate | Enter: view | Tab: write | q: quit';
  };

  return (
    <Box marginTop={1} paddingX={1}>
      <Text dimColor>{getShortcuts()}</Text>
    </Box>
  );
}
