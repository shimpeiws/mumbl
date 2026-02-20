import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentStatusInfo } from './useAgentStatus.js';
import { AgentType } from './useAgentStatus.js';
import {
  DOT_FRAMES,
  THINKING_FRAMES,
  getAgentDisplayName,
  getEmojiFrame,
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

  describe('getEmojiFrame', () => {
    it('should return 3 consecutive emojis starting from frame index', () => {
      const f = THINKING_FRAMES;
      expect(getEmojiFrame(0)).toBe(`${f[0]}${f[1]}${f[2]}`);
      expect(getEmojiFrame(1)).toBe(`${f[1]}${f[2]}${f[3]}`);
      expect(getEmojiFrame(2)).toBe(`${f[2]}${f[3]}${f[0]}`);
      expect(getEmojiFrame(3)).toBe(`${f[3]}${f[0]}${f[1]}`);
    });

    it('should loop correctly', () => {
      expect(getEmojiFrame(4)).toBe(getEmojiFrame(0));
    });
  });

  describe('getTitleFrame', () => {
    it('should return animated title with emojis on both sides for frame 0', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      const emojis = getEmojiFrame(0);
      expect(getTitleFrame(info, 0)).toBe(`${emojis} Claude thinking${DOT_FRAMES[0]} ${emojis}`);
    });

    it('should return animated title for frame 1', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      const emojis = getEmojiFrame(1);
      expect(getTitleFrame(info, 1)).toBe(`${emojis} Claude thinking${DOT_FRAMES[1]} ${emojis}`);
    });

    it('should return animated title for frame 2', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      const emojis = getEmojiFrame(2);
      expect(getTitleFrame(info, 2)).toBe(`${emojis} Claude thinking${DOT_FRAMES[2]} ${emojis}`);
    });

    it('should return animated title for frame 3', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      const emojis = getEmojiFrame(3);
      expect(getTitleFrame(info, 3)).toBe(`${emojis} Claude thinking${DOT_FRAMES[3]} ${emojis}`);
    });

    it('should loop frames correctly for frame 4', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      const emojis = getEmojiFrame(4);
      expect(getTitleFrame(info, 4)).toBe(`${emojis} Claude thinking${DOT_FRAMES[4]} ${emojis}`);
    });

    it('should have 10 dot frames from . to ..........', () => {
      expect(DOT_FRAMES).toHaveLength(10);
      expect(DOT_FRAMES[0]).toBe('.');
      expect(DOT_FRAMES[9]).toBe('..........');
    });

    it('should loop dots after 10 frames', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.ClaudeCode };
      const emojis10 = getEmojiFrame(10);
      // frame 10: dots loop back to DOT_FRAMES[0]
      expect(getTitleFrame(info, 10)).toBe(
        `${emojis10} Claude thinking${DOT_FRAMES[0]} ${emojis10}`,
      );
      // emoji also loops (4 frames), so frame 0 and frame 0 match
      expect(emojis10).toBe(getEmojiFrame(10 % THINKING_FRAMES.length));
    });

    it('should return Gemini thinking for gemini-cli', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.GeminiCLI };
      const emojis = getEmojiFrame(0);
      expect(getTitleFrame(info, 0)).toBe(`${emojis} Gemini thinking${DOT_FRAMES[0]} ${emojis}`);
    });

    it('should return Agent thinking for unknown agent', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Unknown };
      const emojis = getEmojiFrame(0);
      expect(getTitleFrame(info, 0)).toBe(`${emojis} Agent thinking${DOT_FRAMES[0]} ${emojis}`);
    });

    it('should return Cursor thinking for cursor', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Cursor };
      const emojis = getEmojiFrame(1);
      expect(getTitleFrame(info, 1)).toBe(`${emojis} Cursor thinking${DOT_FRAMES[1]} ${emojis}`);
    });

    it('should return Windsurf thinking for windsurf', () => {
      const info: AgentStatusInfo = { status: 'thinking', agent: AgentType.Windsurf };
      const emojis = getEmojiFrame(2);
      expect(getTitleFrame(info, 2)).toBe(`${emojis} Windsurf thinking${DOT_FRAMES[2]} ${emojis}`);
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
