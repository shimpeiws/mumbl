import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext } from './types.js';

class TestAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.ClaudeCode;

  getCapabilities(): AgentCapabilities {
    return {
      canReceiveContext: true,
      canAccessFiles: true,
      canAccessTerminal: true,
      supportsStreaming: true,
    };
  }

  getDisplayName(): string {
    return 'Test Adapter';
  }
}

describe('BaseAgentAdapter', () => {
  let adapter: TestAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    adapter = new TestAdapter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getState', () => {
    it('should return state with isActive based on healthCheck', async () => {
      const state = await adapter.getState();

      expect(state).toHaveProperty('isActive');
      expect(state).toHaveProperty('workingDirectory');
      expect(state.workingDirectory).toBe(process.cwd());
    });
  });

  describe('sendContext', () => {
    it('should return success with no-op response', async () => {
      const context: AgentContext = {
        type: 'file',
        content: 'test content',
      };

      const result = await adapter.sendContext(context);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Context received (no-op)');
    });
  });

  describe('healthCheck', () => {
    it('should return true by default', async () => {
      const isHealthy = await adapter.healthCheck();

      expect(isHealthy).toBe(true);
    });
  });

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value';

      // Access protected method through a test subclass
      class TestAccessAdapter extends BaseAgentAdapter {
        readonly agentType = AgentType.ClaudeCode;
        getCapabilities(): AgentCapabilities {
          return {
            canReceiveContext: false,
            canAccessFiles: false,
            canAccessTerminal: false,
            supportsStreaming: false,
          };
        }
        getDisplayName(): string {
          return 'Test';
        }
        testGetEnvVar(name: string): string | undefined {
          return this.getEnvVar(name);
        }
      }

      const testAdapter = new TestAccessAdapter();
      expect(testAdapter.testGetEnvVar('TEST_VAR')).toBe('test-value');
    });

    it('should return undefined for missing variable', () => {
      class TestAccessAdapter extends BaseAgentAdapter {
        readonly agentType = AgentType.ClaudeCode;
        getCapabilities(): AgentCapabilities {
          return {
            canReceiveContext: false,
            canAccessFiles: false,
            canAccessTerminal: false,
            supportsStreaming: false,
          };
        }
        getDisplayName(): string {
          return 'Test';
        }
        testGetEnvVar(name: string): string | undefined {
          return this.getEnvVar(name);
        }
      }

      const testAdapter = new TestAccessAdapter();
      expect(testAdapter.testGetEnvVar('NONEXISTENT_VAR')).toBeUndefined();
    });
  });

  describe('hasEnvVar', () => {
    it('should return true when variable exists', () => {
      process.env.TEST_EXISTS = 'value';

      class TestAccessAdapter extends BaseAgentAdapter {
        readonly agentType = AgentType.ClaudeCode;
        getCapabilities(): AgentCapabilities {
          return {
            canReceiveContext: false,
            canAccessFiles: false,
            canAccessTerminal: false,
            supportsStreaming: false,
          };
        }
        getDisplayName(): string {
          return 'Test';
        }
        testHasEnvVar(name: string): boolean {
          return this.hasEnvVar(name);
        }
      }

      const testAdapter = new TestAccessAdapter();
      expect(testAdapter.testHasEnvVar('TEST_EXISTS')).toBe(true);
    });

    it('should return false when variable does not exist', () => {
      class TestAccessAdapter extends BaseAgentAdapter {
        readonly agentType = AgentType.ClaudeCode;
        getCapabilities(): AgentCapabilities {
          return {
            canReceiveContext: false,
            canAccessFiles: false,
            canAccessTerminal: false,
            supportsStreaming: false,
          };
        }
        getDisplayName(): string {
          return 'Test';
        }
        testHasEnvVar(name: string): boolean {
          return this.hasEnvVar(name);
        }
      }

      const testAdapter = new TestAccessAdapter();
      expect(testAdapter.testHasEnvVar('DOES_NOT_EXIST')).toBe(false);
    });
  });
});
