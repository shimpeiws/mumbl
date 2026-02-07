import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useScrollableList } from './useScrollableList.js';

afterEach(() => {
  cleanup();
});

interface TestComponentProps {
  totalItems: number;
  initialSelectedIndex: number;
  viewportHeight: number;
}

function TestComponent({ totalItems, initialSelectedIndex, viewportHeight }: TestComponentProps) {
  const [selectedIndex] = useState(initialSelectedIndex);
  const result = useScrollableList({
    totalItems,
    selectedIndex,
    viewportHeight,
  });

  return (
    <Text>
      offset:{result.scrollOffset} start:{result.visibleStartIndex} end:{result.visibleEndIndex}{' '}
      above:{result.hasItemsAbove.toString()} below:{result.hasItemsBelow.toString()}
    </Text>
  );
}

describe('useScrollableList', () => {
  it('should return initial scroll state at top', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={10} initialSelectedIndex={0} viewportHeight={5} />,
    );

    expect(lastFrame()).toContain('offset:0');
    expect(lastFrame()).toContain('start:0');
    expect(lastFrame()).toContain('end:4');
    expect(lastFrame()).toContain('above:false');
    expect(lastFrame()).toContain('below:true');
  });

  it('should scroll down when selected item is near bottom', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={10} initialSelectedIndex={6} viewportHeight={5} />,
    );

    expect(lastFrame()).toContain('offset:2');
    expect(lastFrame()).toContain('start:2');
    expect(lastFrame()).toContain('end:6');
    expect(lastFrame()).toContain('above:true');
    expect(lastFrame()).toContain('below:true');
  });

  it('should handle empty list', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={0} initialSelectedIndex={0} viewportHeight={5} />,
    );

    expect(lastFrame()).toContain('offset:0');
    expect(lastFrame()).toContain('above:false');
    expect(lastFrame()).toContain('below:false');
  });

  it('should handle list smaller than viewport', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={3} initialSelectedIndex={2} viewportHeight={10} />,
    );

    expect(lastFrame()).toContain('offset:0');
    expect(lastFrame()).toContain('start:0');
    expect(lastFrame()).toContain('end:2');
    expect(lastFrame()).toContain('above:false');
    expect(lastFrame()).toContain('below:false');
  });

  it('should show only hasItemsBelow when at top of long list', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={20} initialSelectedIndex={0} viewportHeight={5} />,
    );

    expect(lastFrame()).toContain('above:false');
    expect(lastFrame()).toContain('below:true');
  });

  it('should show only hasItemsAbove when at bottom of long list', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={20} initialSelectedIndex={19} viewportHeight={5} />,
    );

    expect(lastFrame()).toContain('above:true');
    expect(lastFrame()).toContain('below:false');
  });

  it('should show both indicators when in middle of long list', () => {
    const { lastFrame } = render(
      <TestComponent totalItems={20} initialSelectedIndex={10} viewportHeight={5} />,
    );

    expect(lastFrame()).toContain('above:true');
    expect(lastFrame()).toContain('below:true');
  });
});
