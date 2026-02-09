import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentType } from '../types.js';
import {
  createAdapter,
  createAdapterFromDetection,
  getAdapter,
  getRegisteredAdapterTypes,
  registerAdapter,
  registerAdapterClass,
  resetAdapter,
} from './adapter-factory.js';
import type { AgentAdapter, AgentCapabilities } from './types.js';
import { unknownAdapter } from './unknown-adapter.js';

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
    it('should create adapter for ClaudeCode type', () => {
      const adapter = createAdapter(AgentType.ClaudeCode);

      expect(adapter.agentType).toBe(AgentType.ClaudeCode);
      expect(adapter.getDisplayName()).toBe('Claude Code');
    });

    it('should create adapter for Cursor type', () => {
      const adapter = createAdapter(AgentType.Cursor);

      expect(adapter.agentType).toBe(AgentType.Cursor);
      expect(adapter.getDisplayName()).toBe('Cursor');
    });

    it('should create adapter for Windsurf type', () => {
      const adapter = createAdapter(AgentType.Windsurf);

      expect(adapter.agentType).toBe(AgentType.Windsurf);
      expect(adapter.getDisplayName()).toBe('Windsurf');
    });

    it('should create adapter for GeminiCLI type', () => {
      const adapter = createAdapter(AgentType.GeminiCLI);

      expect(adapter.agentType).toBe(AgentType.GeminiCLI);
      expect(adapter.getDisplayName()).toBe('Gemini CLI');
    });

    it('should return unknownAdapter for Unknown type', () => {
      const adapter = createAdapter(AgentType.Unknown);

      expect(adapter).toBe(unknownAdapter);
      expect(adapter.agentType).toBe(AgentType.Unknown);
    });

    it('should fallback to unknownAdapter for unregistered type', () => {
      // Force an unregistered type by casting
      const adapter = createAdapter('unregistered' as AgentType);

      expect(adapter).toBe(unknownAdapter);
    });
  });

  describe('createAdapterFromDetection', () => {
    it('should create adapter based on detection result', () => {
      const detectionResult = {
        agent: AgentType.ClaudeCode,
        detectionMethod: 'env' as const,
      };

      const adapter = createAdapterFromDetection(detectionResult);

      expect(adapter.agentType).toBe(AgentType.ClaudeCode);
    });

    it('should return unknownAdapter for unknown detection', () => {
      const detectionResult = {
        agent: AgentType.Unknown,
        detectionMethod: 'fallback' as const,
      };

      const adapter = createAdapterFromDetection(detectionResult);

      expect(adapter).toBe(unknownAdapter);
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
    it('should register custom adapter factory', () => {
      const customFactory = (): AgentAdapter => ({
        agentType: 'custom' as AgentType,
        getState: async () => ({ isActive: true }),
        sendContext: async () => ({ success: true }),
        getCapabilities: (): AgentCapabilities => ({
          canReceiveContext: true,
          canAccessFiles: false,
          canAccessTerminal: false,
          supportsStreaming: false,
        }),
        healthCheck: async () => true,
        getDisplayName: () => 'Custom',
      });

      registerAdapter('custom' as AgentType, customFactory);
      const adapter = createAdapter('custom' as AgentType);

      expect(adapter.agentType).toBe('custom');
      expect(adapter.getDisplayName()).toBe('Custom');
    });

    it('should override existing adapter registration', () => {
      const newClaudeFactory = (): AgentAdapter => ({
        agentType: AgentType.ClaudeCode,
        getState: async () => ({ isActive: true }),
        sendContext: async () => ({ success: true }),
        getCapabilities: (): AgentCapabilities => ({
          canReceiveContext: true,
          canAccessFiles: false,
          canAccessTerminal: false,
          supportsStreaming: false,
        }),
        healthCheck: async () => true,
        getDisplayName: () => 'New Claude',
      });

      registerAdapter(AgentType.ClaudeCode, newClaudeFactory);
      const adapter = createAdapter(AgentType.ClaudeCode);

      expect(adapter.getDisplayName()).toBe('New Claude');
    });
  });

  describe('registerAdapterClass (legacy)', () => {
    it('should register custom adapter class', () => {
      class CustomAdapter implements AgentAdapter {
        readonly agentType = 'custom-class' as AgentType;
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
          return 'Custom Class';
        }
      }

      registerAdapterClass('custom-class' as AgentType, CustomAdapter);
      const adapter = createAdapter('custom-class' as AgentType);

      expect(adapter.agentType).toBe('custom-class');
      expect(adapter.getDisplayName()).toBe('Custom Class');
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

    it('should return unknownAdapter when no cache and no detection result', () => {
      const adapter = getAdapter();

      expect(adapter).toBe(unknownAdapter);
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

      expect(adapter).toBe(unknownAdapter);
    });
  });
});
