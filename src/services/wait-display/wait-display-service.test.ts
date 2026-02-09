import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProcessingDetector,
  ProcessingStateCallback,
} from '../../infrastructure/agent/processing-detector.js';
import { type WaitDisplayService, createWaitDisplayService } from './wait-display-service.js';

// Create a mock processing detector
function createMockProcessingDetector(): ProcessingDetector & {
  triggerStateChange: (isProcessing: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
} {
  let isProcessing = false;
  let processingStartTime: Date | undefined;
  const callbacks = new Set<ProcessingStateCallback>();

  return {
    async isProcessing() {
      return isProcessing;
    },
    startMonitoring() {
      // No-op for mock
    },
    stopMonitoring() {
      // No-op for mock
    },
    onStateChange(callback: ProcessingStateCallback) {
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
      };
    },
    getProcessingStartTime() {
      return processingStartTime;
    },
    setProcessing(value: boolean) {
      isProcessing = value;
      if (value) {
        processingStartTime = new Date();
      } else {
        processingStartTime = undefined;
      }
    },
    triggerStateChange(value: boolean) {
      this.setProcessing(value);
      for (const callback of callbacks) {
        callback(value);
      }
    },
  };
}

describe('WaitDisplayService', () => {
  let service: WaitDisplayService;
  let mockDetector: ReturnType<typeof createMockProcessingDetector>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDetector = createMockProcessingDetector();
    service = createWaitDisplayService(mockDetector, {
      minWaitTimeMs: 500,
    });
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('should start monitoring when enabled', () => {
      const startMonitoringSpy = vi.spyOn(mockDetector, 'startMonitoring');

      service.start();

      expect(startMonitoringSpy).toHaveBeenCalled();
      expect(service.isActive()).toBe(true);
    });

    it('should not start if disabled', () => {
      const disabledService = createWaitDisplayService(mockDetector, {
        enabled: false,
      });
      const startMonitoringSpy = vi.spyOn(mockDetector, 'startMonitoring');

      disabledService.start();

      expect(startMonitoringSpy).not.toHaveBeenCalled();
      expect(disabledService.isActive()).toBe(false);
    });

    it('should not start if already running', () => {
      service.start();
      const startMonitoringSpy = vi.spyOn(mockDetector, 'startMonitoring');

      service.start(); // Second call

      expect(startMonitoringSpy).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop monitoring', () => {
      service.start();
      const stopMonitoringSpy = vi.spyOn(mockDetector, 'stopMonitoring');

      service.stop();

      expect(stopMonitoringSpy).toHaveBeenCalled();
      expect(service.isActive()).toBe(false);
    });

    it('should hide display if showing', () => {
      const hideCallback = vi.fn();
      service.on('hide', hideCallback);

      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500); // Wait for display to show

      service.stop();

      expect(hideCallback).toHaveBeenCalled();
    });
  });

  describe('processing state changes', () => {
    it('should show display after minimum wait time when processing starts', () => {
      const showCallback = vi.fn();
      service.on('show', showCallback);

      service.start();
      mockDetector.triggerStateChange(true);

      // Before minimum wait time
      vi.advanceTimersByTime(400);
      expect(showCallback).not.toHaveBeenCalled();

      // After minimum wait time
      vi.advanceTimersByTime(100);
      expect(showCallback).toHaveBeenCalled();
    });

    it('should hide display when processing ends', () => {
      const hideCallback = vi.fn();
      service.on('hide', hideCallback);

      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500); // Show display

      mockDetector.triggerStateChange(false);

      expect(hideCallback).toHaveBeenCalled();
    });

    it('should not show display if processing ends before minimum wait time', () => {
      const showCallback = vi.fn();
      service.on('show', showCallback);

      service.start();
      mockDetector.triggerStateChange(true);

      // Processing ends before minimum wait time
      vi.advanceTimersByTime(300);
      mockDetector.triggerStateChange(false);

      // Advance past the original timeout
      vi.advanceTimersByTime(300);

      expect(showCallback).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = service.getState();

      expect(state.isShowing).toBe(false);
      expect(state.elapsedMs).toBe(0);
    });

    it('should reflect showing state after display appears', () => {
      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500);

      const state = service.getState();

      expect(state.isShowing).toBe(true);
    });

    it('should track elapsed time', () => {
      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(1000);

      const state = service.getState();

      expect(state.elapsedMs).toBeGreaterThanOrEqual(900);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.minWaitTimeMs).toBe(500);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({ minWaitTimeMs: 1000 });

      const config = service.getConfig();

      expect(config.minWaitTimeMs).toBe(1000);
    });
  });

  describe('on', () => {
    it('should call show callback when display shows', () => {
      const showCallback = vi.fn();
      service.on('show', showCallback);

      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500);

      expect(showCallback).toHaveBeenCalled();
    });

    it('should call hide callback when display hides', () => {
      const hideCallback = vi.fn();
      service.on('hide', hideCallback);

      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500);
      mockDetector.triggerStateChange(false);

      expect(hideCallback).toHaveBeenCalled();
    });

    it('should call stateChange callback on state changes', () => {
      const stateChangeCallback = vi.fn();
      service.on('stateChange', stateChangeCallback);

      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500);

      expect(stateChangeCallback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const showCallback = vi.fn();
      const unsubscribe = service.on('show', showCallback);

      unsubscribe();

      service.start();
      mockDetector.triggerStateChange(true);
      vi.advanceTimersByTime(500);

      expect(showCallback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      service.on('show', errorCallback);
      service.on('show', normalCallback);

      service.start();
      mockDetector.triggerStateChange(true);

      // Should not throw
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('createWaitDisplayService', () => {
    it('should create a service instance', () => {
      const createdService = createWaitDisplayService(mockDetector);
      expect(createdService).toBeDefined();
      expect(typeof createdService.start).toBe('function');
      expect(typeof createdService.stop).toBe('function');
    });

    it('should accept custom configuration', () => {
      const createdService = createWaitDisplayService(mockDetector, {
        minWaitTimeMs: 1000,
      });

      expect(createdService.getConfig().minWaitTimeMs).toBe(1000);
    });
  });
});
