import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { geminiCLIDetector } from './gemini-cli-detector.js';

describe('geminiCLIDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct agent type', () => {
    expect(geminiCLIDetector.agentType).toBe(AgentType.GeminiCLI);
  });

  it('should detect via GEMINI_CLI env var', async () => {
    process.env.GEMINI_CLI = '1';

    const result = await geminiCLIDetector.detect();

    expect(result).toEqual({
      agent: AgentType.GeminiCLI,
      detectionMethod: 'env',
      metadata: {
        envVar: 'GEMINI_CLI',
        value: '1',
      },
    });
  });

  it('should detect via GEMINI_CLI_SESSION_ID env var', async () => {
    process.env.GEMINI_CLI_SESSION_ID = 'session-abc';

    const result = await geminiCLIDetector.detect();

    expect(result).toEqual({
      agent: AgentType.GeminiCLI,
      detectionMethod: 'env',
      metadata: {
        envVar: 'GEMINI_CLI_SESSION_ID',
        value: 'session-abc',
      },
    });
  });

  it('should detect via GOOGLE_GEMINI_CLI env var', async () => {
    process.env.GOOGLE_GEMINI_CLI = 'true';

    const result = await geminiCLIDetector.detect();

    expect(result).toEqual({
      agent: AgentType.GeminiCLI,
      detectionMethod: 'env',
      metadata: {
        envVar: 'GOOGLE_GEMINI_CLI',
        value: 'true',
      },
    });
  });

  it('should return null when no Gemini CLI env vars are set', async () => {
    delete process.env.GEMINI_CLI;
    delete process.env.GEMINI_CLI_SESSION_ID;
    delete process.env.GOOGLE_GEMINI_CLI;

    const result = await geminiCLIDetector.detect();

    expect(result).toBeNull();
  });

  it('should return null when env var is empty string', async () => {
    process.env.GEMINI_CLI = '';

    const result = await geminiCLIDetector.detect();

    expect(result).toBeNull();
  });

  it('should prioritize first matching env var', async () => {
    process.env.GEMINI_CLI = '1';
    process.env.GEMINI_CLI_SESSION_ID = 'session-123';

    const result = await geminiCLIDetector.detect();

    expect(result?.metadata?.envVar).toBe('GEMINI_CLI');
  });
});
