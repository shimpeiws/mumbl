import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logAgentDetection } from './logger.js';
import type { AgentDetectionResult } from './types.js';
import { AgentType } from './types.js';

describe('logAgentDetection', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockReset();
  });

  it('should log detected Claude Code agent', () => {
    const result: AgentDetectionResult = {
      agent: AgentType.ClaudeCode,
      detectionMethod: 'env',
      metadata: { envVar: 'CLAUDE_CODE', value: '1' },
    };

    logAgentDetection(result);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Agent Detection] Detected: Claude Code via env (envVar=CLAUDE_CODE, value=1)',
    );
  });

  it('should log detected Cursor agent', () => {
    const result: AgentDetectionResult = {
      agent: AgentType.Cursor,
      detectionMethod: 'env',
      metadata: { envVar: 'TERM_PROGRAM', value: 'Cursor' },
    };

    logAgentDetection(result);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Agent Detection] Detected: Cursor via env (envVar=TERM_PROGRAM, value=Cursor)',
    );
  });

  it('should log detected Windsurf agent', () => {
    const result: AgentDetectionResult = {
      agent: AgentType.Windsurf,
      detectionMethod: 'env',
    };

    logAgentDetection(result);

    expect(consoleLogSpy).toHaveBeenCalledWith('[Agent Detection] Detected: Windsurf via env');
  });

  it('should log detected Gemini CLI agent', () => {
    const result: AgentDetectionResult = {
      agent: AgentType.GeminiCLI,
      detectionMethod: 'env',
      metadata: { envVar: 'GEMINI_CLI', value: 'true' },
    };

    logAgentDetection(result);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Agent Detection] Detected: Gemini CLI via env (envVar=GEMINI_CLI, value=true)',
    );
  });

  it('should log unknown agent fallback', () => {
    const result: AgentDetectionResult = {
      agent: AgentType.Unknown,
      detectionMethod: 'fallback',
    };

    logAgentDetection(result);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Agent Detection] No AI coding agent detected (method: fallback)',
    );
  });

  it('should handle detection without metadata', () => {
    const result: AgentDetectionResult = {
      agent: AgentType.ClaudeCode,
      detectionMethod: 'process',
    };

    logAgentDetection(result);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Agent Detection] Detected: Claude Code via process',
    );
  });
});
