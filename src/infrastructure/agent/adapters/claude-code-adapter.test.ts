import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import { ClaudeCodeAdapter } from './claude-code-adapter.js';

describe('ClaudeCodeAdapter', () => {
  let adapter: ClaudeCodeAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    adapter = new ClaudeCodeAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('agentType', () => {
    it('should be ClaudeCode', () => {
      expect(adapter.agentType).toBe(AgentType.ClaudeCode);
    });
  });

  describe('getDisplayName', () => {
    it('should return Claude Code', () => {
      expect(adapter.getDisplayName()).toBe('Claude Code');
    });
  });

  describe('getState', () => {
    it('should include session ID when available', async () => {
      process.env.CLAUDE_CODE_SESSION_ID = 'test-session-123';
      process.env.CLAUDE_CODE_VERSION = '1.0.0';

      const state = await adapter.getState();

      expect(state.sessionId).toBe('test-session-123');
      expect(state.metadata?.version).toBe('1.0.0');
    });

    it('should handle missing environment variables', async () => {
      const state = await adapter.getState();

      expect(state.sessionId).toBeUndefined();
      expect(state.metadata?.version).toBe('unknown');
    });
  });

  describe('sendContext', () => {
    it('should acknowledge context receipt', async () => {
      const result = await adapter.sendContext({
        type: 'file',
        content: 'test content',
        filePath: '/test/file.ts',
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('file');
      expect(result.response).toContain('Claude Code');
    });
  });

  describe('getCapabilities', () => {
    it('should indicate full capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.canReceiveContext).toBe(true);
      expect(capabilities.canAccessFiles).toBe(true);
      expect(capabilities.canAccessTerminal).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.custom?.hasMCP).toBe(true);
      expect(capabilities.custom?.hasToolUse).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true when CLAUDE_CODE is set', async () => {
      process.env.CLAUDE_CODE = 'true';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when CLAUDE_CODE_VERSION is set', async () => {
      process.env.CLAUDE_CODE_VERSION = '1.0.0';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when CLAUDE_CODE_SESSION_ID is set', async () => {
      process.env.CLAUDE_CODE_SESSION_ID = 'session-123';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when no Claude Code env vars are set', async () => {
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});
