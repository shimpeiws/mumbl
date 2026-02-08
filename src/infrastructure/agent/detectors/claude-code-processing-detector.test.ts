import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClaudeCodeProcessingDetector,
  createClaudeCodeProcessingDetector,
} from './claude-code-processing-detector.js';

describe('ClaudeCodeProcessingDetector', () => {
  let detector: ClaudeCodeProcessingDetector;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    detector = new ClaudeCodeProcessingDetector();
  });

  afterEach(() => {
    detector.stopMonitoring();
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('isProcessing', () => {
    it('should return false when no processing indicators are set', async () => {
      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(false);
    });

    it('should return true when CLAUDE_CODE_PROCESSING is true', async () => {
      process.env.CLAUDE_CODE_PROCESSING = 'true';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(true);
    });

    it('should return false when CLAUDE_CODE_PROCESSING is false', async () => {
      process.env.CLAUDE_CODE_PROCESSING = 'false';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(false);
    });

    it('should return true when CLAUDE_CODE_THINKING is true', async () => {
      process.env.CLAUDE_CODE_THINKING = 'true';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(true);
    });

    it('should return false when CLAUDE_CODE_THINKING is false', async () => {
      process.env.CLAUDE_CODE_THINKING = 'false';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(false);
    });

    it('should return true when CLAUDE_CODE_TOOL_USE is true', async () => {
      process.env.CLAUDE_CODE_TOOL_USE = 'true';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(true);
    });

    it('should return false when CLAUDE_CODE_TOOL_USE is false', async () => {
      process.env.CLAUDE_CODE_TOOL_USE = 'false';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(false);
    });

    it('should prioritize CLAUDE_CODE_PROCESSING over other indicators', async () => {
      process.env.CLAUDE_CODE_PROCESSING = 'true';
      process.env.CLAUDE_CODE_THINKING = 'false';
      process.env.CLAUDE_CODE_TOOL_USE = 'false';

      const isProcessing = await detector.isProcessing();
      expect(isProcessing).toBe(true);
    });
  });

  describe('createClaudeCodeProcessingDetector', () => {
    it('should create a detector instance', () => {
      const createdDetector = createClaudeCodeProcessingDetector();
      expect(createdDetector).toBeInstanceOf(ClaudeCodeProcessingDetector);
    });

    it('should accept custom polling interval', () => {
      const createdDetector = createClaudeCodeProcessingDetector(50);
      expect(createdDetector).toBeInstanceOf(ClaudeCodeProcessingDetector);
    });
  });

  describe('monitoring', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should detect state changes when monitoring', async () => {
      const callback = vi.fn();
      detector.onStateChange(callback);

      detector.startMonitoring();

      // Initially not processing - async timer advancement
      await vi.advanceTimersByTimeAsync(100);
      expect(callback).not.toHaveBeenCalled();

      // Set processing state
      process.env.CLAUDE_CODE_PROCESSING = 'true';
      await vi.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledWith(true);

      // End processing
      process.env.CLAUDE_CODE_PROCESSING = 'false';
      await vi.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});
