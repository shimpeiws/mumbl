import { describe, expect, it } from 'vitest';
import { AgentType } from '../types.js';
import { unknownAdapter } from './unknown-adapter.js';

describe('unknownAdapter', () => {
  describe('agentType', () => {
    it('should be Unknown', () => {
      expect(unknownAdapter.agentType).toBe(AgentType.Unknown);
    });
  });

  describe('getDisplayName', () => {
    it('should return Unknown Agent', () => {
      expect(unknownAdapter.getDisplayName()).toBe('Unknown Agent');
    });
  });

  describe('sendContext', () => {
    it('should return failure for unknown agents', async () => {
      const result = await unknownAdapter.sendContext({
        type: 'file',
        content: 'test content',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown agent');
    });
  });

  describe('getCapabilities', () => {
    it('should indicate no capabilities', () => {
      const capabilities = unknownAdapter.getCapabilities();

      expect(capabilities.canReceiveContext).toBe(false);
      expect(capabilities.canAccessFiles).toBe(false);
      expect(capabilities.canAccessTerminal).toBe(false);
      expect(capabilities.supportsStreaming).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should always return true as fallback', async () => {
      const isHealthy = await unknownAdapter.healthCheck();

      expect(isHealthy).toBe(true);
    });
  });
});
