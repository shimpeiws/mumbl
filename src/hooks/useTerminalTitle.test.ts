import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentStatusInfo } from './useAgentStatus.js';
import { AgentType } from './useAgentStatus.js';
import {
  DOT_FRAMES,
  THINKING_FRAMES,
  getAgentDisplayName,
  getTitleFrame,
  setTerminalTitle,
} from './useTerminalTitle.js';

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

  describe('getTitleFrame', () => {
    it('should return animated title for frame 0', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      expect(getTitleFrame(info, 0)).toBe(`${THINKING_FRAMES[0]} Claude thinking${DOT_FRAMES[0]}`);
    });

    it('should return animated title for frame 1', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      expect(getTitleFrame(info, 1)).toBe(`${THINKING_FRAMES[1]} Claude thinking${DOT_FRAMES[1]}`);
    });

    it('should return animated title for frame 2', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      expect(getTitleFrame(info, 2)).toBe(`${THINKING_FRAMES[2]} Claude thinking${DOT_FRAMES[2]}`);
    });

    it('should return animated title for frame 3', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      expect(getTitleFrame(info, 3)).toBe(`${THINKING_FRAMES[3]} Claude thinking${DOT_FRAMES[0]}`);
    });

    it('should loop frames correctly for frame 4', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      expect(getTitleFrame(info, 4)).toBe(`${THINKING_FRAMES[0]} Claude thinking${DOT_FRAMES[1]}`);
    });

    it('should return Gemini thinking for gemini-cli', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.GeminiCLI };
      expect(getTitleFrame(info, 0)).toBe(`${THINKING_FRAMES[0]} Gemini thinking${DOT_FRAMES[0]}`);
    });

    it('should return Agent thinking for unknown agent', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Unknown };
      expect(getTitleFrame(info, 0)).toBe(`${THINKING_FRAMES[0]} Agent thinking${DOT_FRAMES[0]}`);
    });

    it('should return Cursor thinking for cursor', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Cursor };
      expect(getTitleFrame(info, 1)).toBe(`${THINKING_FRAMES[1]} Cursor thinking${DOT_FRAMES[1]}`);
    });

    it('should return Windsurf thinking for windsurf', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Windsurf };
      expect(getTitleFrame(info, 2)).toBe(
        `${THINKING_FRAMES[2]} Windsurf thinking${DOT_FRAMES[2]}`,
      );
    });

    it('should return mumbl for idle status regardless of frame', () => {
      const info: AgentStatusInfo = { status: 'idle', agent: AgentType.ClaudeCode };
      expect(getTitleFrame(info, 0)).toBe('mumbl');
      expect(getTitleFrame(info, 5)).toBe('mumbl');
      expect(getTitleFrame(info, 100)).toBe('mumbl');
    });

    it('should return mumbl for idle with any agent', () => {
      const info: AgentStatusInfo = { status: 'idle', agent: AgentType.GeminiCLI };
      expect(getTitleFrame(info, 0)).toBe('mumbl');
    });
  });
});
