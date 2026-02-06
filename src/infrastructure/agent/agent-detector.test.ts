import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDetectorService, detectAgent, getAgentDetector } from './agent-detector.js';
import type { AgentDetectionResult, AgentDetector } from './types.js';
import { AgentType } from './types.js';

describe('AgentDetectorService', () => {
  describe('detect', () => {
    it('should return first matching detector result', async () => {
      const mockResult: AgentDetectionResult = {
        agent: AgentType.ClaudeCode,
        detectionMethod: 'env',
        metadata: { envVar: 'CLAUDE_CODE', value: '1' },
      };

      const mockDetector1: AgentDetector = {
        agentType: AgentType.ClaudeCode,
        detect: vi.fn().mockResolvedValue(mockResult),
      };

      const mockDetector2: AgentDetector = {
        agentType: AgentType.Cursor,
        detect: vi.fn().mockResolvedValue(null),
      };

      const service = new AgentDetectorService([mockDetector1, mockDetector2]);
      const result = await service.detect();

      expect(result).toEqual(mockResult);
      expect(mockDetector1.detect).toHaveBeenCalled();
      expect(mockDetector2.detect).not.toHaveBeenCalled();
    });

    it('should return Unknown when no detector matches', async () => {
      const mockDetector1: AgentDetector = {
        agentType: AgentType.ClaudeCode,
        detect: vi.fn().mockResolvedValue(null),
      };

      const mockDetector2: AgentDetector = {
        agentType: AgentType.Cursor,
        detect: vi.fn().mockResolvedValue(null),
      };

      const service = new AgentDetectorService([mockDetector1, mockDetector2]);
      const result = await service.detect();

      expect(result).toEqual({
        agent: AgentType.Unknown,
        detectionMethod: 'fallback',
      });
      expect(mockDetector1.detect).toHaveBeenCalled();
      expect(mockDetector2.detect).toHaveBeenCalled();
    });

    it('should check detectors in order', async () => {
      const callOrder: string[] = [];

      const mockDetector1: AgentDetector = {
        agentType: AgentType.ClaudeCode,
        detect: vi.fn().mockImplementation(async () => {
          callOrder.push('claude');
          return null;
        }),
      };

      const mockDetector2: AgentDetector = {
        agentType: AgentType.Cursor,
        detect: vi.fn().mockImplementation(async () => {
          callOrder.push('cursor');
          return null;
        }),
      };

      const service = new AgentDetectorService([mockDetector1, mockDetector2]);
      await service.detect();

      expect(callOrder).toEqual(['claude', 'cursor']);
    });
  });

  describe('getRegisteredAgents', () => {
    it('should return all registered agent types', () => {
      const mockDetector1: AgentDetector = {
        agentType: AgentType.ClaudeCode,
        detect: vi.fn(),
      };

      const mockDetector2: AgentDetector = {
        agentType: AgentType.Cursor,
        detect: vi.fn(),
      };

      const service = new AgentDetectorService([mockDetector1, mockDetector2]);
      const agents = service.getRegisteredAgents();

      expect(agents).toEqual([AgentType.ClaudeCode, AgentType.Cursor]);
    });
  });
});

describe('getAgentDetector', () => {
  it('should return a singleton instance', () => {
    const instance1 = getAgentDetector();
    const instance2 = getAgentDetector();

    expect(instance1).toBe(instance2);
  });

  it('should have default detectors registered', () => {
    const detector = getAgentDetector();
    const agents = detector.getRegisteredAgents();

    expect(agents).toContain(AgentType.ClaudeCode);
    expect(agents).toContain(AgentType.Cursor);
    expect(agents).toContain(AgentType.Windsurf);
    expect(agents).toContain(AgentType.GeminiCLI);
  });
});

describe('detectAgent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should detect agent using singleton detector', async () => {
    const result = await detectAgent();

    expect(result).toHaveProperty('agent');
    expect(result).toHaveProperty('detectionMethod');
  });
});
