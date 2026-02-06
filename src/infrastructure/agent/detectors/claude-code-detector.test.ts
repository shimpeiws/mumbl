import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { ClaudeCodeDetector } from './claude-code-detector.js';

describe('ClaudeCodeDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct agent type', () => {
    const detector = new ClaudeCodeDetector();
    expect(detector.agentType).toBe(AgentType.ClaudeCode);
  });

  it('should detect via CLAUDE_CODE env var', async () => {
    process.env.CLAUDE_CODE = '1';

    const detector = new ClaudeCodeDetector();
    const result = await detector.detect();

    expect(result).toEqual({
      agent: AgentType.ClaudeCode,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CLAUDE_CODE',
        value: '1',
      },
    });
  });

  it('should detect via CLAUDE_CODE_VERSION env var', async () => {
    process.env.CLAUDE_CODE_VERSION = '1.0.0';

    const detector = new ClaudeCodeDetector();
    const result = await detector.detect();

    expect(result).toEqual({
      agent: AgentType.ClaudeCode,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CLAUDE_CODE_VERSION',
        value: '1.0.0',
      },
    });
  });

  it('should detect via CLAUDE_CODE_SESSION_ID env var', async () => {
    process.env.CLAUDE_CODE_SESSION_ID = 'session-123';

    const detector = new ClaudeCodeDetector();
    const result = await detector.detect();

    expect(result).toEqual({
      agent: AgentType.ClaudeCode,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CLAUDE_CODE_SESSION_ID',
        value: 'session-123',
      },
    });
  });

  it('should return null when no Claude Code env vars are set', async () => {
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_VERSION;
    delete process.env.CLAUDE_CODE_SESSION_ID;

    const detector = new ClaudeCodeDetector();
    const result = await detector.detect();

    expect(result).toBeNull();
  });

  it('should return null when env var is empty string', async () => {
    process.env.CLAUDE_CODE = '';

    const detector = new ClaudeCodeDetector();
    const result = await detector.detect();

    expect(result).toBeNull();
  });

  it('should prioritize first matching env var', async () => {
    process.env.CLAUDE_CODE = '1';
    process.env.CLAUDE_CODE_VERSION = '1.0.0';

    const detector = new ClaudeCodeDetector();
    const result = await detector.detect();

    expect(result?.metadata?.envVar).toBe('CLAUDE_CODE');
  });
});
