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
 * Wait display service interface
 */
export interface WaitDisplayService {
  start(): void;
  stop(): void;
  getState(): WaitDisplayState;
  getConfig(): WaitDisplayConfig;
  updateConfig(config: Partial<WaitDisplayConfig>): void;
  on<K extends WaitDisplayEventType>(event: K, callback: WaitDisplayEventCallback<K>): () => void;
  isActive(): boolean;
}

/**
 * Create a new WaitDisplayService instance
 */
export function createWaitDisplayService(
  processingDetector: ProcessingDetector,
  initialConfig: Partial<WaitDisplayConfig> = {},
): WaitDisplayService {
  let config: WaitDisplayConfig = { ...DEFAULT_WAIT_DISPLAY_CONFIG, ...initialConfig };
  const state: WaitDisplayState = {
    isShowing: false,
    elapsedMs: 0,
  };
  const listeners = new Map<
    WaitDisplayEventType,
    Set<WaitDisplayEventCallback<WaitDisplayEventType>>
  >();
  let showTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let elapsedIntervalId: ReturnType<typeof setInterval> | undefined;
  let unsubscribeProcessing: (() => void) | undefined;
  let isRunning = false;

  const emit = <K extends WaitDisplayEventType>(event: K, data: WaitDisplayEvents[K]): void => {
    const callbacks = listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch {
          // Ignore listener errors
        }
      }
    }
  };

  const clearTimers = (): void => {
    if (showTimeoutId) {
      clearTimeout(showTimeoutId);
      showTimeoutId = undefined;
    }
    if (elapsedIntervalId) {
      clearInterval(elapsedIntervalId);
      elapsedIntervalId = undefined;
    }
  };

  const showDisplay = (): void => {
    if (state.isShowing) {
      return;
    }

    state.isShowing = true;
    emit('show', undefined);
    emit('stateChange', { ...state });
  };

  const hideDisplay = (): void => {
    if (!state.isShowing) {
      return;
    }

    state.isShowing = false;
    emit('hide', undefined);
    emit('stateChange', { ...state });
  };

  const onProcessingStart = (): void => {
    // Set up timer to show display after minimum wait time
    state.startTime = new Date();
    state.elapsedMs = 0;

    showTimeoutId = setTimeout(() => {
      showDisplay();
    }, config.minWaitTimeMs);

    // Start tracking elapsed time
    elapsedIntervalId = setInterval(() => {
      if (state.startTime) {
        state.elapsedMs = Date.now() - state.startTime.getTime();
        emit('stateChange', { ...state });
      }
    }, 100);
  };

  const onProcessingEnd = (): void => {
    clearTimers();

    // Hide display if showing
    if (state.isShowing) {
      hideDisplay();
    }

    // Reset state
    state.startTime = undefined;
    state.elapsedMs = 0;
  };

  const start = (): void => {
    if (!config.enabled || isRunning) {
      return;
    }

    isRunning = true;

    // Subscribe to processing state changes
    unsubscribeProcessing = processingDetector.onStateChange((isProcessing) => {
      if (isProcessing) {
        onProcessingStart();
      } else {
        onProcessingEnd();
      }
    });

    // Start monitoring
    processingDetector.startMonitoring();
  };

  const stop = (): void => {
    isRunning = false;

    // Unsubscribe from processing state changes
    if (unsubscribeProcessing) {
      unsubscribeProcessing();
      unsubscribeProcessing = undefined;
    }

    // Stop monitoring
    processingDetector.stopMonitoring();

    // Clear any pending timers
    clearTimers();

    // Hide display if showing
    if (state.isShowing) {
      hideDisplay();
    }
  };

  const getState = (): WaitDisplayState => ({ ...state });

  const getConfig = (): WaitDisplayConfig => ({ ...config });

  const updateConfig = (newConfig: Partial<WaitDisplayConfig>): void => {
    config = { ...config, ...newConfig };
  };

  const on = <K extends WaitDisplayEventType>(
    event: K,
    callback: WaitDisplayEventCallback<K>,
  ): (() => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(callback as WaitDisplayEventCallback<WaitDisplayEventType>);

    return () => {
      listeners.get(event)?.delete(callback as WaitDisplayEventCallback<WaitDisplayEventType>);
    };
  };

  const isActive = (): boolean => isRunning;

  return {
    start,
    stop,
    getState,
    getConfig,
    updateConfig,
    on,
    isActive,
  };
}
