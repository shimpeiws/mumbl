import { cleanup, render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { HelpFooter } from './HelpFooter.js';

afterEach(() => {
  cleanup();
});

describe('HelpFooter', () => {
  it('should show list mode shortcuts', () => {
    const { lastFrame } = render(<HelpFooter mode="list" />);

    expect(lastFrame()).toContain('j/k: navigate');
    expect(lastFrame()).toContain('Enter: view');
    expect(lastFrame()).toContain('Tab: write');
    expect(lastFrame()).toContain('q: quit');
  });

  it('should show write mode shortcuts', () => {
    const { lastFrame } = render(<HelpFooter mode="write" />);

    expect(lastFrame()).toContain('Tab: list');
    expect(lastFrame()).toContain('Esc: cancel');
    expect(lastFrame()).toContain('q: quit');
  });

  it('should show detail view shortcuts when viewing detail', () => {
    const { lastFrame } = render(<HelpFooter mode="list" isViewingDetail={true} />);

    expect(lastFrame()).toContain('Esc/q: back');
    expect(lastFrame()).toContain('Tab: write');
  });

  it('should show config mode shortcuts with wordgrain dir', () => {
    const { lastFrame } = render(<HelpFooter mode="config" hasWordgrainDir={true} />);

    expect(lastFrame()).toContain('j/k: navigate');
    expect(lastFrame()).toContain('a: add');
    expect(lastFrame()).toContain('d: delete');
    expect(lastFrame()).toContain('r: reload');
    expect(lastFrame()).toContain('Esc: back');
    expect(lastFrame()).toContain('q: quit');
  });

  it('should hide wordgrain shortcuts in config mode without wordgrain dir', () => {
    const { lastFrame } = render(<HelpFooter mode="config" />);

    expect(lastFrame()).not.toContain('j/k: navigate');
    expect(lastFrame()).not.toContain('a: add');
    expect(lastFrame()).not.toContain('d: delete');
    expect(lastFrame()).toContain('r: reload');
    expect(lastFrame()).toContain('Esc: back');
    expect(lastFrame()).toContain('q: quit');
  });

  it('should show config hint in list mode shortcuts', () => {
    const { lastFrame } = render(<HelpFooter mode="list" />);

    expect(lastFrame()).toContain('c: config');
  });
});
