import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';
import type { QueueStatus } from '../../../services/queue/index.js';
import { QueueIndicator } from './QueueIndicator.js';

describe('QueueIndicator', () => {
  it('should render nothing when queue is empty', () => {
    const status: QueueStatus = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    const { lastFrame } = render(<QueueIndicator status={status} />);

    expect(lastFrame()).toBe('');
  });

  it('should show pending count when tasks are pending', () => {
    const status: QueueStatus = {
      pending: 3,
      running: 0,
      completed: 0,
      failed: 0,
      total: 3,
    };

    const { lastFrame } = render(<QueueIndicator status={status} />);

    expect(lastFrame()).toContain('3 pending');
  });

  it('should show processing when tasks are running', () => {
    const status: QueueStatus = {
      pending: 0,
      running: 1,
      completed: 0,
      failed: 0,
      total: 1,
    };

    const { lastFrame } = render(<QueueIndicator status={status} />);

    expect(lastFrame()).toContain('processing');
  });

  it('should show processing with pending count when both are active', () => {
    const status: QueueStatus = {
      pending: 2,
      running: 1,
      completed: 0,
      failed: 0,
      total: 3,
    };

    const { lastFrame } = render(<QueueIndicator status={status} />);

    expect(lastFrame()).toContain('processing');
    expect(lastFrame()).toContain('+2');
  });

  it('should not show completed or failed tasks', () => {
    const status: QueueStatus = {
      pending: 0,
      running: 0,
      completed: 5,
      failed: 2,
      total: 7,
    };

    const { lastFrame } = render(<QueueIndicator status={status} />);

    expect(lastFrame()).toBe('');
  });
});
