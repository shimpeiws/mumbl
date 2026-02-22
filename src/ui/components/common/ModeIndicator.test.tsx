import { cleanup, render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ModeIndicator } from './ModeIndicator.js';

afterEach(() => {
  cleanup();
});

describe('ModeIndicator', () => {
  it('should render both mode labels', () => {
    const { lastFrame } = render(<ModeIndicator currentMode="list" />);

    expect(lastFrame()).toContain('Write');
    expect(lastFrame()).toContain('List');
  });

  it('should display list mode indicator', () => {
    const { lastFrame } = render(<ModeIndicator currentMode="list" />);

    expect(lastFrame()).toContain('List');
  });

  it('should display write mode indicator', () => {
    const { lastFrame } = render(<ModeIndicator currentMode="write" />);

    expect(lastFrame()).toContain('Write');
  });

  it('should display config mode indicator', () => {
    const { lastFrame } = render(<ModeIndicator currentMode="config" />);

    expect(lastFrame()).toContain('Config');
  });
});
