import type { ProcessingDetector } from '../../infrastructure/agent/processing-detector.js';
import {
  DEFAULT_WAIT_DISPLAY_CONFIG,
  type WaitDisplayConfig,
  type WaitDisplayEventCallback,
  type WaitDisplayEventType,
  type WaitDisplayEvents,
  type WaitDisplayState,
} from './types.js';

/**
 * Service for managing wait time display during Claude Code processing
 */
export class WaitDisplayService {
  private config: WaitDisplayConfig;
  private processingDetector: ProcessingDetector;
  private state: WaitDisplayState;
  private listeners: Map<WaitDisplayEventType, Set<WaitDisplayEventCallback<WaitDisplayEventType>>>;
  private showTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private elapsedIntervalId: ReturnType<typeof setInterval> | undefined;
  private unsubscribeProcessing: (() => void) | undefined;
  private isRunning = false;

  constructor(processingDetector: ProcessingDetector, config: Partial<WaitDisplayConfig> = {}) {
    this.processingDetector = processingDetector;
    this.config = { ...DEFAULT_WAIT_DISPLAY_CONFIG, ...config };
    this.state = {
      isShowing: false,
      elapsedMs: 0,
    };
    this.listeners = new Map();
  }

  /**
   * Start the wait display service
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Subscribe to processing state changes
    this.unsubscribeProcessing = this.processingDetector.onStateChange((isProcessing) => {
      if (isProcessing) {
        this.onProcessingStart();
      } else {
        this.onProcessingEnd();
      }
    });

    // Start monitoring
    this.processingDetector.startMonitoring();
  }

  /**
   * Stop the wait display service
   */
  stop(): void {
    this.isRunning = false;

    // Unsubscribe from processing state changes
    if (this.unsubscribeProcessing) {
      this.unsubscribeProcessing();
      this.unsubscribeProcessing = undefined;
    }

    // Stop monitoring
    this.processingDetector.stopMonitoring();

    // Clear any pending timers
    this.clearTimers();

    // Hide display if showing
    if (this.state.isShowing) {
      this.hideDisplay();
    }
  }

  /**
   * Get the current state
   */
  getState(): WaitDisplayState {
    return { ...this.state };
  }

  /**
   * Get the current configuration
   */
  getConfig(): WaitDisplayConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<WaitDisplayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Subscribe to events
   */
  on<K extends WaitDisplayEventType>(event: K, callback: WaitDisplayEventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback as WaitDisplayEventCallback<WaitDisplayEventType>);

    return () => {
      this.listeners.get(event)?.delete(callback as WaitDisplayEventCallback<WaitDisplayEventType>);
    };
  }

  /**
   * Check if the service is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  private onProcessingStart(): void {
    // Set up timer to show display after minimum wait time
    this.state.startTime = new Date();
    this.state.elapsedMs = 0;

    this.showTimeoutId = setTimeout(() => {
      this.showDisplay();
    }, this.config.minWaitTimeMs);

    // Start tracking elapsed time
    this.elapsedIntervalId = setInterval(() => {
      if (this.state.startTime) {
        this.state.elapsedMs = Date.now() - this.state.startTime.getTime();
        this.emit('stateChange', this.getState());
      }
    }, 100);
  }

  private onProcessingEnd(): void {
    this.clearTimers();

    // Hide display if showing
    if (this.state.isShowing) {
      this.hideDisplay();
    }

    // Reset state
    this.state.startTime = undefined;
    this.state.elapsedMs = 0;
  }

  private showDisplay(): void {
    if (this.state.isShowing) {
      return;
    }

    this.state.isShowing = true;
    this.emit('show', undefined);
    this.emit('stateChange', this.getState());
  }

  private hideDisplay(): void {
    if (!this.state.isShowing) {
      return;
    }

    this.state.isShowing = false;
    this.emit('hide', undefined);
    this.emit('stateChange', this.getState());
  }

  private clearTimers(): void {
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = undefined;
    }
    if (this.elapsedIntervalId) {
      clearInterval(this.elapsedIntervalId);
      this.elapsedIntervalId = undefined;
    }
  }

  private emit<K extends WaitDisplayEventType>(event: K, data: WaitDisplayEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }
}

/**
 * Create a new WaitDisplayService instance
 */
export function createWaitDisplayService(
  processingDetector: ProcessingDetector,
  config?: Partial<WaitDisplayConfig>,
): WaitDisplayService {
  return new WaitDisplayService(processingDetector, config);
}
