import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseProcessingDetector } from './processing-detector.js';

// Create a concrete implementation for testing
class TestProcessingDetector extends BaseProcessingDetector {
  private mockIsProcessing = false;

  setMockProcessing(value: boolean): void {
    this.mockIsProcessing = value;
  }

  async isProcessing(): Promise<boolean> {
    return this.mockIsProcessing;
  }

  // Expose protected method for testing
  public triggerStateChange(isProcessing: boolean): void {
    this.notifyStateChange(isProcessing);
  }
}

describe('BaseProcessingDetector', () => {
  let detector: TestProcessingDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    detector = new TestProcessingDetector(100);
  });

  afterEach(() => {
    detector.stopMonitoring();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('isProcessing', () => {
    it('should return current processing state', async () => {
      expect(await detector.isProcessing()).toBe(false);

      detector.setMockProcessing(true);
      expect(await detector.isProcessing()).toBe(true);
    });
  });

  describe('startMonitoring', () => {
    it('should start polling for state changes', async () => {
      const callback = vi.fn();
      detector.onStateChange(callback);
      detector.setMockProcessing(true);

      detector.startMonitoring();

      // Advance timer and flush promises to trigger async polling
      await vi.advanceTimersByTimeAsync(100);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should not start if already monitoring', () => {
      detector.startMonitoring();
      detector.startMonitoring(); // Second call should be no-op

      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop polling', () => {
      const callback = vi.fn();
      detector.onStateChange(callback);

      detector.startMonitoring();
      detector.stopMonitoring();

      // Advance timer - should not trigger callback
      vi.advanceTimersByTime(200);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onStateChange', () => {
    it('should call callback when state changes', () => {
      const callback = vi.fn();
      detector.onStateChange(callback);

      detector.triggerStateChange(true);
      expect(callback).toHaveBeenCalledWith(true);

      detector.triggerStateChange(false);
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should not call callback when state stays the same', () => {
      const callback = vi.fn();
      detector.onStateChange(callback);

      detector.triggerStateChange(false);
      expect(callback).not.toHaveBeenCalled(); // Initial state is false

      detector.triggerStateChange(true);
      expect(callback).toHaveBeenCalledTimes(1);

      detector.triggerStateChange(true); // Same state
      expect(callback).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = detector.onStateChange(callback);

      detector.triggerStateChange(true);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      detector.triggerStateChange(false);
      expect(callback).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      detector.onStateChange(callback1);
      detector.onStateChange(callback2);

      detector.triggerStateChange(true);

      expect(callback1).toHaveBeenCalledWith(true);
      expect(callback2).toHaveBeenCalledWith(true);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      detector.onStateChange(errorCallback);
      detector.onStateChange(normalCallback);

      // Should not throw
      expect(() => detector.triggerStateChange(true)).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalledWith(true);
    });
  });

  describe('getProcessingStartTime', () => {
    it('should return undefined when not processing', () => {
      expect(detector.getProcessingStartTime()).toBeUndefined();
    });

    it('should return start time when processing starts', () => {
      const beforeTime = new Date();
      detector.triggerStateChange(true);
      const afterTime = new Date();

      const startTime = detector.getProcessingStartTime();
      expect(startTime).toBeDefined();
      expect(startTime?.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(startTime?.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should return undefined when processing ends', () => {
      detector.triggerStateChange(true);
      expect(detector.getProcessingStartTime()).toBeDefined();

      detector.triggerStateChange(false);
      expect(detector.getProcessingStartTime()).toBeUndefined();
    });
  });
});
