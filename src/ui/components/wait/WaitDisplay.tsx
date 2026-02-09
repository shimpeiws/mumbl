import { Box, Text } from 'ink';
import React from 'react';
import { LoadingAnimation } from '../splash/LoadingAnimation.js';
import { Logo } from '../splash/Logo.js';

interface WaitDisplayProps {
  /** Callback when the display is dismissed */
  onDismiss?: () => void;
  /** Elapsed time in milliseconds */
  elapsedMs?: number;
  /** Whether to show the elapsed time */
  showElapsedTime?: boolean;
}

/**
 * Format milliseconds to a human-readable string
 */
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Wait display component shown during Claude Code processing
 * Reuses the splash screen components for consistent branding
 */
export function WaitDisplay({
  onDismiss: _onDismiss,
  elapsedMs = 0,
  showElapsedTime = true,
}: WaitDisplayProps) {
  // Note: In Ink, keyboard handling is typically done via useInput hook
  // For dismiss functionality, the parent component should handle
  // keyboard input and call onDismiss when appropriate
  // The _onDismiss parameter is available for future use

  return (
    <Box flexDirection="column" alignItems="center" padding={1}>
      <Logo />
      <Box marginTop={1}>
        <LoadingAnimation />
      </Box>
      {showElapsedTime && elapsedMs > 0 && (
        <Box marginTop={1}>
          <Text dimColor>waiting for response... {formatElapsedTime(elapsedMs)}</Text>
        </Box>
      )}
    </Box>
  );
}
