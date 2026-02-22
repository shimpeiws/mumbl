import { Box, Text } from 'ink';
import React from 'react';
import type { AppMode } from '../../context/NavigationContext.js';

interface ModeIndicatorProps {
  currentMode: AppMode;
}

export function ModeIndicator({ currentMode }: ModeIndicatorProps) {
  return (
    <Box>
      <Text dimColor>{'['}</Text>
      <Text color={currentMode === 'write' ? 'green' : 'gray'} bold={currentMode === 'write'}>
        Write
      </Text>
      <Text dimColor>{']'}</Text>
      <Text dimColor> | </Text>
      <Text dimColor>{'['}</Text>
      <Text color={currentMode === 'list' ? 'cyan' : 'gray'} bold={currentMode === 'list'}>
        List
      </Text>
      <Text dimColor>{']'}</Text>
      {currentMode === 'config' && (
        <>
          <Text dimColor> | </Text>
          <Text dimColor>{'['}</Text>
          <Text color="yellow" bold>
            Config
          </Text>
          <Text dimColor>{']'}</Text>
        </>
      )}
    </Box>
  );
}
