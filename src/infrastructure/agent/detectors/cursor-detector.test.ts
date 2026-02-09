import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { cursorDetector } from './cursor-detector.js';

describe('cursorDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct agent type', () => {
    expect(cursorDetector.agentType).toBe(AgentType.Cursor);
  });

  it('should detect via CURSOR_SESSION_ID env var', async () => {
    process.env.CURSOR_SESSION_ID = 'session-456';

    const result = await cursorDetector.detect();

    expect(result).toEqual({
      agent: AgentType.Cursor,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CURSOR_SESSION_ID',
        value: 'session-456',
      },
    });
  });

  it('should detect via CURSOR_EDITOR env var', async () => {
    process.env.CURSOR_EDITOR = 'true';

    const result = await cursorDetector.detect();

    expect(result).toEqual({
      agent: AgentType.Cursor,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CURSOR_EDITOR',
        value: 'true',
      },
    });
  });

  it('should detect via TERM_PROGRAM=Cursor', async () => {
    process.env.TERM_PROGRAM = 'Cursor';

    const result = await cursorDetector.detect();

    expect(result).toEqual({
      agent: AgentType.Cursor,
      detectionMethod: 'env',
      metadata: {
        envVar: 'TERM_PROGRAM',
        value: 'Cursor',
      },
    });
  });

  it('should return null when no Cursor env vars are set', async () => {
    delete process.env.CURSOR_SESSION_ID;
    delete process.env.CURSOR_EDITOR;
    delete process.env.CURSOR_TRACE_ID;
    delete process.env.TERM_PROGRAM;

    const result = await cursorDetector.detect();

    expect(result).toBeNull();
  });

  it('should return null when TERM_PROGRAM is not Cursor', async () => {
    process.env.TERM_PROGRAM = 'vscode';

    const result = await cursorDetector.detect();

    expect(result).toBeNull();
  });

  it('should return null when env var is empty string', async () => {
    process.env.CURSOR_SESSION_ID = '';

    const result = await cursorDetector.detect();

    expect(result).toBeNull();
  });
});
