/**
 * Processing state change callback
 */
export type ProcessingStateCallback = (isProcessing: boolean) => void;

/**
 * Interface for detecting agent processing state
 */
export interface ProcessingDetector {
  /**
   * Check if the agent is currently processing a request
   */
  isProcessing(): Promise<boolean>;

  /**
   * Start monitoring for processing state changes
   */
  startMonitoring(): void;

  /**
   * Stop monitoring for processing state changes
   */
  stopMonitoring(): void;

  /**
   * Subscribe to processing state changes
   * @param callback - Function called when processing state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: ProcessingStateCallback): () => void;

  /**
   * Get the time when processing started, if currently processing
   */
  getProcessingStartTime(): Date | undefined;
}

/**
 * Base implementation of ProcessingDetector with common functionality
 */
export abstract class BaseProcessingDetector implements ProcessingDetector {
  protected isMonitoring = false;
  protected processingStartTime: Date | undefined;
  protected currentlyProcessing = false;
  protected callbacks: Set<ProcessingStateCallback> = new Set();
  protected pollingInterval: ReturnType<typeof setInterval> | undefined;
  protected pollingIntervalMs: number;

  constructor(pollingIntervalMs = 100) {
    this.pollingIntervalMs = pollingIntervalMs;
  }

  abstract isProcessing(): Promise<boolean>;

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }
    this.isMonitoring = true;
    this.poll();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  onStateChange(callback: ProcessingStateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  getProcessingStartTime(): Date | undefined {
    return this.processingStartTime;
  }

  protected notifyStateChange(isProcessing: boolean): void {
    if (isProcessing !== this.currentlyProcessing) {
      this.currentlyProcessing = isProcessing;
      if (isProcessing) {
        this.processingStartTime = new Date();
      } else {
        this.processingStartTime = undefined;
      }
      for (const callback of this.callbacks) {
        try {
          callback(isProcessing);
        } catch {
          // Ignore callback errors
        }
      }
    }
  }

  private poll(): void {
    const doPoll = async (): Promise<void> => {
      if (!this.isMonitoring) {
        return;
      }
      try {
        const isProcessing = await this.isProcessing();
        this.notifyStateChange(isProcessing);
      } catch {
        // Ignore polling errors
      }
      if (this.isMonitoring) {
        this.pollingInterval = setTimeout(doPoll, this.pollingIntervalMs);
      }
    };
    // Initial poll after interval
    this.pollingInterval = setTimeout(doPoll, this.pollingIntervalMs);
  }
}
