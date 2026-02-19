import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { claudeCodeDetector } from './claude-code-detector.js';

describe('claudeCodeDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clean all Claude Code env vars to ensure test isolation
    delete process.env['CLAUDECODE'];
    delete process.env['CLAUDE_CODE_ENTRYPOINT'];
    delete process.env['CLAUDE_CODE'];
    delete process.env['CLAUDE_CODE_VERSION'];
    delete process.env['CLAUDE_CODE_SESSION_ID'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct agent type', () => {
    expect(claudeCodeDetector.agentType).toBe(AgentType.ClaudeCode);
  });

  it('should detect via CLAUDECODE env var', async () => {
    process.env['CLAUDECODE'] = '1';

    const result = await claudeCodeDetector.detect();

    expect(result).toEqual({
      agent: AgentType.ClaudeCode,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CLAUDECODE',
        value: '1',
      },
    });
  });

  it('should detect via CLAUDE_CODE_ENTRYPOINT env var', async () => {
    process.env['CLAUDE_CODE_ENTRYPOINT'] = 'cli';

    const result = await claudeCodeDetector.detect();

    expect(result).toEqual({
      agent: AgentType.ClaudeCode,
      detectionMethod: 'env',
      metadata: {
        envVar: 'CLAUDE_CODE_ENTRYPOINT',
        value: 'cli',
      },
    });
  });

  it('should detect via CLAUDE_CODE env var', async () => {
    process.env.CLAUDE_CODE = '1';

    const result = await claudeCodeDetector.detect();

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

    const result = await claudeCodeDetector.detect();

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

    const result = await claudeCodeDetector.detect();

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
    delete process.env['CLAUDECODE'];
    delete process.env['CLAUDE_CODE_ENTRYPOINT'];
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_VERSION;
    delete process.env.CLAUDE_CODE_SESSION_ID;

    const result = await claudeCodeDetector.detect();

    expect(result).toBeNull();
  });

  it('should return null when env var is empty string', async () => {
    process.env.CLAUDE_CODE = '';

    const result = await claudeCodeDetector.detect();

    expect(result).toBeNull();
  });

  it('should prioritize first matching env var', async () => {
    process.env['CLAUDECODE'] = '1';
    process.env.CLAUDE_CODE = '1';
    process.env.CLAUDE_CODE_VERSION = '1.0.0';

    const result = await claudeCodeDetector.detect();

    expect(result?.metadata?.envVar).toBe('CLAUDECODE');
  });
});
