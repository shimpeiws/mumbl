import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider, useNavigation } from './NavigationContext.js';

afterEach(() => {
  cleanup();
});

function TestComponent() {
  const { mode, listState, writeState } = useNavigation();
  return (
    <Text>
      mode:{mode} listIndex:{listState.selectedIndex} writeContent:{writeState.content}
    </Text>
  );
}

describe('NavigationContext', () => {
  it('should provide default mode as list', () => {
    const { lastFrame } = render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>,
    );

    expect(lastFrame()).toContain('mode:list');
  });

  it('should allow setting initial mode', () => {
    const { lastFrame } = render(
      <NavigationProvider initialMode="write">
        <TestComponent />
      </NavigationProvider>,
    );

    expect(lastFrame()).toContain('mode:write');
  });

  it('should provide default list state', () => {
    const { lastFrame } = render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>,
    );

    expect(lastFrame()).toContain('listIndex:0');
  });

  it('should provide default write state', () => {
    const { lastFrame } = render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>,
    );

    expect(lastFrame()).toContain('writeContent:');
  });
});
