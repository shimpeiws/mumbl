import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentStatusInfo } from './useAgentStatus.js';
import { AgentType } from './useAgentStatus.js';
import { getAgentDisplayName, getTitle, setTerminalTitle } from './useTerminalTitle.js';

describe('useTerminalTitle', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setTerminalTitle', () => {
    it('should write ANSI escape sequence to stdout', () => {
      setTerminalTitle('test title');
      expect(writeSpy).toHaveBeenCalledWith('\x1b]0;test title\x07');
    });

    it('should write mumbl as title', () => {
      setTerminalTitle('mumbl');
      expect(writeSpy).toHaveBeenCalledWith('\x1b]0;mumbl\x07');
    });
  });

  describe('getAgentDisplayName', () => {
    it('should return Claude for ClaudeCode', () => {
      expect(getAgentDisplayName(AgentType.ClaudeCode)).toBe('Claude');
    });

    it('should return Gemini for GeminiCLI', () => {
      expect(getAgentDisplayName(AgentType.GeminiCLI)).toBe('Gemini');
    });

    it('should return Cursor for Cursor', () => {
      expect(getAgentDisplayName(AgentType.Cursor)).toBe('Cursor');
    });

    it('should return Windsurf for Windsurf', () => {
      expect(getAgentDisplayName(AgentType.Windsurf)).toBe('Windsurf');
    });

    it('should return Agent for Unknown', () => {
      expect(getAgentDisplayName(AgentType.Unknown)).toBe('Agent');
    });
  });

  describe('getTitle', () => {
    it('should return Claude thinking title for thinking claude-code', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      expect(getTitle(info)).toBe('\u2699 Claude thinking...');
    });

    it('should return Gemini thinking title for thinking gemini-cli', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.GeminiCLI };
      expect(getTitle(info)).toBe('\u2699 Gemini thinking...');
    });

    it('should return Agent thinking for unknown agent', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Unknown };
      expect(getTitle(info)).toBe('\u2699 Agent thinking...');
    });

    it('should return mumbl for idle status', () => {
      const info: AgentStatusInfo = { status: 'idle', agent: AgentType.ClaudeCode };
      expect(getTitle(info)).toBe('mumbl');
    });

    it('should return mumbl for idle with any agent', () => {
      const info: AgentStatusInfo = { status: 'idle', agent: AgentType.GeminiCLI };
      expect(getTitle(info)).toBe('mumbl');
    });
  });
});
