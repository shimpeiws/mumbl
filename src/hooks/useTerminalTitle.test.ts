import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentStatus } from './useClaudeStatus.js';
import { getTitle, setTerminalTitle } from './useTerminalTitle.js';

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

  describe('getTitle', () => {
    it('should return thinking title for thinking status', () => {
      const result = getTitle('thinking');
      expect(result).toBe('\u2699 Claude thinking...');
    });

    it('should return mumbl for idle status', () => {
      const result = getTitle('idle');
      expect(result).toBe('mumbl');
    });

    it('should return mumbl for any non-thinking status', () => {
      const result = getTitle('idle' as AgentStatus);
      expect(result).toBe('mumbl');
    });
  });
});
