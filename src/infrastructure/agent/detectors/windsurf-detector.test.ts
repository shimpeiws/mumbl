import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { windsurfDetector } from './windsurf-detector.js';

describe('windsurfDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct agent type', () => {
    expect(windsurfDetector.agentType).toBe(AgentType.Windsurf);
  });

  it('should detect via WINDSURF_SESSION_ID env var', async () => {
    process.env.WINDSURF_SESSION_ID = 'session-789';

    const result = await windsurfDetector.detect();

    expect(result).toEqual({
      agent: AgentType.Windsurf,
      detectionMethod: 'env',
      metadata: {
        envVar: 'WINDSURF_SESSION_ID',
        value: 'session-789',
      },
    });
  });

  it('should detect via CODEIUM_WINDSURF env var', async () => {
    process.env.CODEIUM_WINDSURF = 'true';

    const result = await windsurfDetector.detect();

    expect(result).toEqual({
      agent: AgentType.Windsurf,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CODEIUM_WINDSURF',
        value: 'true',
      },
    });
  });

  it('should detect via TERM_PROGRAM=Windsurf', async () => {
    process.env.TERM_PROGRAM = 'Windsurf';

    const result = await windsurfDetector.detect();

    expect(result).toEqual({
      agent: AgentType.Windsurf,
      detectionMethod: 'env',
      metadata: {
        envVar: 'TERM_PROGRAM',
        value: 'Windsurf',
      },
    });
  });

  it('should return null when no Windsurf env vars are set', async () => {
    delete process.env.WINDSURF_SESSION_ID;
    delete process.env.WINDSURF_EDITOR;
    delete process.env.CODEIUM_WINDSURF;
    delete process.env.TERM_PROGRAM;

    const result = await windsurfDetector.detect();

    expect(result).toBeNull();
  });

  it('should return null when TERM_PROGRAM is not Windsurf', async () => {
    process.env.TERM_PROGRAM = 'vscode';

    const result = await windsurfDetector.detect();

    expect(result).toBeNull();
  });

  it('should return null when env var is empty string', async () => {
    process.env.WINDSURF_SESSION_ID = '';

    const result = await windsurfDetector.detect();

    expect(result).toBeNull();
  });
});
