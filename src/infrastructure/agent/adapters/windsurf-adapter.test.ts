import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import type { AgentAdapter } from './types.js';
import { createWindsurfAdapter } from './windsurf-adapter.js';

describe('createWindsurfAdapter', () => {
  let adapter: AgentAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    adapter = createWindsurfAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('agentType', () => {
    it('should be Windsurf', () => {
      expect(adapter.agentType).toBe(AgentType.Windsurf);
    });
  });

  describe('getDisplayName', () => {
    it('should return Windsurf', () => {
      expect(adapter.getDisplayName()).toBe('Windsurf');
    });
  });

  describe('getState', () => {
    it('should include session ID when available', async () => {
      process.env.WINDSURF_SESSION_ID = 'windsurf-session-123';
      process.env.CODEIUM_WINDSURF = 'true';

      const state = await adapter.getState();

      expect(state.sessionId).toBe('windsurf-session-123');
      expect(state.metadata?.codeium).toBe('true');
    });
  });

  describe('sendContext', () => {
    it('should acknowledge context receipt', async () => {
      const result = await adapter.sendContext({
        type: 'error',
        content: 'Error message',
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('error');
      expect(result.response).toContain('Windsurf');
    });
  });

  describe('getCapabilities', () => {
    it('should indicate Windsurf-specific capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.canReceiveContext).toBe(true);
      expect(capabilities.canAccessFiles).toBe(true);
      expect(capabilities.custom?.hasCascade).toBe(true);
      expect(capabilities.custom?.hasCodeium).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true when WINDSURF_SESSION_ID is set', async () => {
      process.env.WINDSURF_SESSION_ID = 'session-123';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when CODEIUM_WINDSURF is set', async () => {
      process.env.CODEIUM_WINDSURF = 'true';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when TERM_PROGRAM is Windsurf', async () => {
      process.env.TERM_PROGRAM = 'Windsurf';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when no Windsurf env vars are set', async () => {
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});
