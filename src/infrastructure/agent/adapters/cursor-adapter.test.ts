import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import { CursorAdapter } from './cursor-adapter.js';

describe('CursorAdapter', () => {
  let adapter: CursorAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    adapter = new CursorAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('agentType', () => {
    it('should be Cursor', () => {
      expect(adapter.agentType).toBe(AgentType.Cursor);
    });
  });

  describe('getDisplayName', () => {
    it('should return Cursor', () => {
      expect(adapter.getDisplayName()).toBe('Cursor');
    });
  });

  describe('getState', () => {
    it('should include session ID and trace ID when available', async () => {
      process.env.CURSOR_SESSION_ID = 'cursor-session-123';
      process.env.CURSOR_TRACE_ID = 'trace-456';

      const state = await adapter.getState();

      expect(state.sessionId).toBe('cursor-session-123');
      expect(state.metadata?.traceId).toBe('trace-456');
    });
  });

  describe('sendContext', () => {
    it('should acknowledge context receipt', async () => {
      const result = await adapter.sendContext({
        type: 'selection',
        content: 'selected code',
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('selection');
      expect(result.response).toContain('Cursor');
    });
  });

  describe('getCapabilities', () => {
    it('should indicate Cursor-specific capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.canReceiveContext).toBe(true);
      expect(capabilities.canAccessFiles).toBe(true);
      expect(capabilities.custom?.hasComposer).toBe(true);
      expect(capabilities.custom?.hasInlineEdit).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true when CURSOR_SESSION_ID is set', async () => {
      process.env.CURSOR_SESSION_ID = 'session-123';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when CURSOR_EDITOR is set', async () => {
      process.env.CURSOR_EDITOR = 'true';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return true when TERM_PROGRAM is Cursor', async () => {
      process.env.TERM_PROGRAM = 'Cursor';

      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when no Cursor env vars are set', async () => {
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});
