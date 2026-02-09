import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import { createGeminiCLIAdapter } from './gemini-cli-adapter.js';
import type { AgentAdapter } from './types.js';

describe('createGeminiCLIAdapter', () => {
  let adapter: AgentAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    adapter = createGeminiCLIAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('agentType', () => {
    it('should be GeminiCLI', () => {
      expect(adapter.agentType).toBe(AgentType.GeminiCLI);
    });
  });

  describe('getDisplayName', () => {
    it('should return Gemini CLI', () => {
      expect(adapter.getDisplayName()).toBe('Gemini CLI');
    });
  });

  describe('getState', () => {
    it('should include session ID when available', async () => {
      process.env.GEMINI_CLI_SESSION_ID = 'gemini-session-123';
      process.env.GOOGLE_GEMINI_CLI = 'true';

      const state = await adapter.getState();

      expect(state.sessionId).toBe('gemini-session-123');
      expect(state.metadata?.googleGemini).toBe('true');
    });
  });

  describe('sendContext', () => {
    it('should acknowledge context receipt', async () => {
      const result = await adapter.sendContext({
        type: 'output',
        content: 'Command output',
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('output');
      expect(result.response).toContain('Gemini CLI');
    });
  });

  describe('getCapabilities', () => {
    it('should indicate Gemini-specific capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.canReceiveContext).toBe(true);
      expect(capabilities.canAccessFiles).toBe(true);
      expect(capabilities.canAccessTerminal).toBe(true);
      expect(capabilities.custom?.hasGoogleIntegration).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true when GEMINI_CLI is set', async () => {
      process.env.GEMINI_CLI = 'true';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when GEMINI_CLI_SESSION_ID is set', async () => {
      process.env.GEMINI_CLI_SESSION_ID = 'session-123';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when GOOGLE_GEMINI_CLI is set', async () => {
      process.env.GOOGLE_GEMINI_CLI = 'true';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when no Gemini env vars are set', async () => {
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});
