import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import {
  createAdapter,
  createAdapterFromDetection,
  getAdapter,
  getRegisteredAdapterTypes,
  registerAdapter,
  resetAdapter,
} from './adapter-factory.js';
import { ClaudeCodeAdapter } from './claude-code-adapter.js';
import { CursorAdapter } from './cursor-adapter.js';
import { GeminiCLIAdapter } from './gemini-cli-adapter.js';
import type { AgentAdapter, AgentCapabilities } from './types.js';
import { UnknownAdapter } from './unknown-adapter.js';
import { WindsurfAdapter } from './windsurf-adapter.js';

describe('adapter-factory', () => {
  beforeEach(() => {
    vi.resetModules();
    resetAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAdapter();
  });

  describe('createAdapter', () => {
    it('should create ClaudeCodeAdapter for ClaudeCode type', () => {
      const adapter = createAdapter(AgentType.ClaudeCode);

      expect(adapter).toBeInstanceOf(ClaudeCodeAdapter);
      expect(adapter.agentType).toBe(AgentType.ClaudeCode);
    });

    it('should create CursorAdapter for Cursor type', () => {
      const adapter = createAdapter(AgentType.Cursor);

      expect(adapter).toBeInstanceOf(CursorAdapter);
      expect(adapter.agentType).toBe(AgentType.Cursor);
    });

    it('should create WindsurfAdapter for Windsurf type', () => {
      const adapter = createAdapter(AgentType.Windsurf);

      expect(adapter).toBeInstanceOf(WindsurfAdapter);
      expect(adapter.agentType).toBe(AgentType.Windsurf);
    });

    it('should create GeminiCLIAdapter for GeminiCLI type', () => {
      const adapter = createAdapter(AgentType.GeminiCLI);

      expect(adapter).toBeInstanceOf(GeminiCLIAdapter);
      expect(adapter.agentType).toBe(AgentType.GeminiCLI);
    });

    it('should create UnknownAdapter for Unknown type', () => {
      const adapter = createAdapter(AgentType.Unknown);

      expect(adapter).toBeInstanceOf(UnknownAdapter);
      expect(adapter.agentType).toBe(AgentType.Unknown);
    });

    it('should fallback to UnknownAdapter for unregistered type', () => {
      // Force an unregistered type by casting
      const adapter = createAdapter('unregistered' as AgentType);

      expect(adapter).toBeInstanceOf(UnknownAdapter);
    });
  });

  describe('createAdapterFromDetection', () => {
    it('should create adapter based on detection result', () => {
      const detectionResult = {
        agent: AgentType.ClaudeCode,
        detectionMethod: 'env' as const,
      };

      const adapter = createAdapterFromDetection(detectionResult);

      expect(adapter).toBeInstanceOf(ClaudeCodeAdapter);
    });

    it('should create UnknownAdapter for unknown detection', () => {
      const detectionResult = {
        agent: AgentType.Unknown,
        detectionMethod: 'fallback' as const,
      };

      const adapter = createAdapterFromDetection(detectionResult);

      expect(adapter).toBeInstanceOf(UnknownAdapter);
    });
  });

  describe('getRegisteredAdapterTypes', () => {
    it('should return all registered adapter types', () => {
      const types = getRegisteredAdapterTypes();

      expect(types).toContain(AgentType.ClaudeCode);
      expect(types).toContain(AgentType.Cursor);
      expect(types).toContain(AgentType.Windsurf);
      expect(types).toContain(AgentType.GeminiCLI);
      expect(types).toContain(AgentType.Unknown);
      expect(types.length).toBe(5);
    });
  });

  describe('registerAdapter', () => {
    it('should register custom adapter', () => {
      class CustomAdapter implements AgentAdapter {
        readonly agentType = 'custom' as AgentType;
        async getState() {
          return { isActive: true };
        }
        async sendContext() {
          return { success: true };
        }
        getCapabilities(): AgentCapabilities {
          return {
            canReceiveContext: true,
            canAccessFiles: false,
            canAccessTerminal: false,
            supportsStreaming: false,
          };
        }
        async healthCheck() {
          return true;
        }
        getDisplayName() {
          return 'Custom';
        }
      }

      registerAdapter('custom' as AgentType, CustomAdapter);
      const adapter = createAdapter('custom' as AgentType);

      expect(adapter).toBeInstanceOf(CustomAdapter);
    });

    it('should override existing adapter registration', () => {
      class NewClaudeAdapter implements AgentAdapter {
        readonly agentType = AgentType.ClaudeCode;
        async getState() {
          return { isActive: true };
        }
        async sendContext() {
          return { success: true };
        }
        getCapabilities(): AgentCapabilities {
          return {
            canReceiveContext: true,
            canAccessFiles: false,
            canAccessTerminal: false,
            supportsStreaming: false,
          };
        }
        async healthCheck() {
          return true;
        }
        getDisplayName() {
          return 'New Claude';
        }
      }

      registerAdapter(AgentType.ClaudeCode, NewClaudeAdapter);
      const adapter = createAdapter(AgentType.ClaudeCode);

      expect(adapter).toBeInstanceOf(NewClaudeAdapter);
      expect(adapter.getDisplayName()).toBe('New Claude');
    });
  });

  describe('getAdapter', () => {
    it('should return cached adapter when no detection result provided', () => {
      const detectionResult = {
        agent: AgentType.ClaudeCode,
        detectionMethod: 'env' as const,
      };

      const adapter1 = getAdapter(detectionResult);
      const adapter2 = getAdapter();

      expect(adapter1.agentType).toBe(AgentType.ClaudeCode);
      expect(adapter2.agentType).toBe(AgentType.ClaudeCode);
    });

    it('should return UnknownAdapter when no cache and no detection result', () => {
      const adapter = getAdapter();

      expect(adapter).toBeInstanceOf(UnknownAdapter);
    });

    it('should update cache when new detection result provided', () => {
      const firstResult = {
        agent: AgentType.ClaudeCode,
        detectionMethod: 'env' as const,
      };
      const secondResult = {
        agent: AgentType.Cursor,
        detectionMethod: 'env' as const,
      };

      getAdapter(firstResult);
      const adapter = getAdapter(secondResult);

      expect(adapter.agentType).toBe(AgentType.Cursor);
    });
  });

  describe('resetAdapter', () => {
    it('should clear cached adapter', () => {
      const detectionResult = {
        agent: AgentType.ClaudeCode,
        detectionMethod: 'env' as const,
      };

      getAdapter(detectionResult);
      resetAdapter();
      const adapter = getAdapter();

      expect(adapter).toBeInstanceOf(UnknownAdapter);
    });
  });
});
