import { Box, Text } from 'ink';
import React from 'react';
import type { QueueStatus } from '../../../services/queue/index.js';
import type { AppMode } from '../../context/NavigationContext.js';
import { QueueIndicator } from './QueueIndicator.js';

interface HelpFooterProps {
  mode: AppMode;
  isViewingDetail?: boolean;
  queueStatus?: QueueStatus;
}

export function HelpFooter({ mode, isViewingDetail = false, queueStatus }: HelpFooterProps) {
  const getShortcuts = () => {
    if (mode === 'write') {
      return 'Tab: list | Esc: cancel | q: quit';
    }
    if (mode === 'config') {
      return 'j/k: navigate | Space: toggle | a: add | d: unregister | r: reload | Esc: back | q: quit';
    }
    if (isViewingDetail) {
      return 'Esc/q: back | d: delete | Tab: write';
    }
    return 'j/k: navigate | Enter: view | Tab: write | c: config | q: quit';
  };

  return (
    <Box marginTop={1} paddingX={1} justifyContent="space-between">
      <Text dimColor>{getShortcuts()}</Text>
      {queueStatus && <QueueIndicator status={queueStatus} />}
    </Box>
  );
}
