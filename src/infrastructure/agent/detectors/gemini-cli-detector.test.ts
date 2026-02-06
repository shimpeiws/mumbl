import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { GeminiCLIDetector } from './gemini-cli-detector.js';

describe('GeminiCLIDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should have correct agent type', () => {
    const detector = new GeminiCLIDetector();
    expect(detector.agentType).toBe(AgentType.GeminiCLI);
  });

  it('should detect via GEMINI_CLI env var', async () => {
    process.env.GEMINI_CLI = '1';

    const detector = new GeminiCLIDetector();
    const result = await detector.detect();

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

    const detector = new GeminiCLIDetector();
    const result = await detector.detect();

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

    const detector = new GeminiCLIDetector();
    const result = await detector.detect();

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

    const detector = new GeminiCLIDetector();
    const result = await detector.detect();

    expect(result).toBeNull();
  });

  it('should return null when env var is empty string', async () => {
    process.env.GEMINI_CLI = '';

    const detector = new GeminiCLIDetector();
    const result = await detector.detect();

    expect(result).toBeNull();
  });

  it('should prioritize first matching env var', async () => {
    process.env.GEMINI_CLI = '1';
    process.env.GEMINI_CLI_SESSION_ID = 'session-123';

    const detector = new GeminiCLIDetector();
    const result = await detector.detect();

    expect(result?.metadata?.envVar).toBe('GEMINI_CLI');
  });
});
