import { Text } from 'ink';
import React from 'react';
import type { QueueStatus } from '../../../services/queue/index.js';

interface QueueIndicatorProps {
  status: QueueStatus;
}

/**
 * Compact queue status indicator for display in footer
 * Only shows when there are active tasks
 */
export function QueueIndicator({ status }: QueueIndicatorProps) {
  const { pending, running } = status;
  const activeCount = pending + running;

  // Don't show anything if queue is empty
  if (activeCount === 0) {
    return null;
  }

  // Show spinner when processing
  if (running > 0) {
    return (
      <Text dimColor>
        [processing{pending > 0 ? ` +${pending}` : ''}]
      </Text>
    );
  }

  // Show pending count
  return (
    <Text dimColor>
      [{pending} pending]
    </Text>
  );
}
