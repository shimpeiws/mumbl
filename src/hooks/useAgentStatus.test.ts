import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGENT_STATUS_FILE_PATH,
  AgentType,
  parseAgentName,
  readAgentStatusFile,
} from './useAgentStatus.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    watch: vi.fn(),
  };
});

const fsMock = await import('node:fs');
const readFileSyncMock = vi.mocked(fsMock.readFileSync);

describe('useAgentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AGENT_STATUS_FILE_PATH', () => {
    it('should be /tmp/mumbl-agent-status', () => {
      expect(AGENT_STATUS_FILE_PATH).toBe('/tmp/mumbl-agent-status');
    });
  });

  describe('parseAgentName', () => {
    it('should parse claude-code', () => {
      expect(parseAgentName('claude-code')).toBe(AgentType.ClaudeCode);
    });

    it('should parse gemini-cli', () => {
      expect(parseAgentName('gemini-cli')).toBe(AgentType.GeminiCLI);
    });

    it('should parse cursor', () => {
      expect(parseAgentName('cursor')).toBe(AgentType.Cursor);
    });

    it('should parse windsurf', () => {
      expect(parseAgentName('windsurf')).toBe(AgentType.Windsurf);
    });

    it('should return Unknown for unrecognized agent', () => {
      expect(parseAgentName('unknown-agent')).toBe(AgentType.Unknown);
    });

    it('should handle case-insensitive input', () => {
      expect(parseAgentName('Claude-Code')).toBe(AgentType.ClaudeCode);
    });

    it('should trim whitespace', () => {
      expect(parseAgentName('  gemini-cli  ')).toBe(AgentType.GeminiCLI);
    });
  });

  describe('readAgentStatusFile', () => {
    it('should parse thinking:claude-code format', () => {
      readFileSyncMock.mockReturnValue('thinking:claude-code');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'thinking', agent: AgentType.ClaudeCode });
    });

    it('should parse thinking:gemini-cli format', () => {
      readFileSyncMock.mockReturnValue('thinking:gemini-cli');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'thinking', agent: AgentType.GeminiCLI });
    });

    it('should parse idle:claude-code format', () => {
      readFileSyncMock.mockReturnValue('idle:claude-code');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'idle', agent: AgentType.ClaudeCode });
    });

    it('should handle plain thinking (backward compatibility)', () => {
      readFileSyncMock.mockReturnValue('thinking');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'thinking', agent: AgentType.Unknown });
    });

    it('should return idle for plain idle', () => {
      readFileSyncMock.mockReturnValue('idle');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'idle', agent: AgentType.Unknown });
    });

    it('should return idle when file is missing', () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'idle', agent: AgentType.Unknown });
    });

    it('should return idle when file is empty', () => {
      readFileSyncMock.mockReturnValue('');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'idle', agent: AgentType.Unknown });
    });

    it('should return idle for invalid content', () => {
      readFileSyncMock.mockReturnValue('invalid');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'idle', agent: AgentType.Unknown });
    });

    it('should accept a custom file path', () => {
      readFileSyncMock.mockReturnValue('thinking:claude-code');
      readAgentStatusFile('/custom/path');
      expect(readFileSyncMock).toHaveBeenCalledWith('/custom/path', 'utf-8');
    });

    it('should handle unknown agent in extended format', () => {
      readFileSyncMock.mockReturnValue('thinking:some-new-agent');
      const result = readAgentStatusFile();
      expect(result).toEqual({ status: 'thinking', agent: AgentType.Unknown });
    });
  });

  describe('useAgentStatus hook', () => {
    it('should be exported as a function', async () => {
      readFileSyncMock.mockReturnValue('idle');
      const { useAgentStatus } = await import('./useAgentStatus.js');
      expect(useAgentStatus).toBeDefined();
      expect(typeof useAgentStatus).toBe('function');
    });
  });
});
