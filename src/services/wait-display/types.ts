/**
 * Configuration for the wait display feature
 */
export interface WaitDisplayConfig {
  /** Whether the wait display is enabled */
  enabled: boolean;
  /** Minimum wait time in ms before showing the display (default: 500ms) */
  minWaitTimeMs: number;
  /** Polling interval in ms for checking processing state (default: 100ms) */
  pollingIntervalMs: number;
}

/**
 * Default wait display configuration
 */
export const DEFAULT_WAIT_DISPLAY_CONFIG: WaitDisplayConfig = {
  enabled: true,
  minWaitTimeMs: 500,
  pollingIntervalMs: 100,
};

/**
 * Wait display state
 */
export interface WaitDisplayState {
  /** Whether the display is currently showing */
  isShowing: boolean;
  /** When the wait started */
  startTime?: Date;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
}

/**
 * Callback for wait display state changes
 */
export type WaitDisplayStateCallback = (state: WaitDisplayState) => void;

/**
 * Events emitted by the wait display service
 */
export interface WaitDisplayEvents {
  /** Emitted when the display should be shown */
  show: undefined;
  /** Emitted when the display should be hidden */
  hide: undefined;
  /** Emitted when the state changes */
  stateChange: WaitDisplayState;
}

/**
 * Event callback types
 */
export type WaitDisplayEventType = keyof WaitDisplayEvents;
export type WaitDisplayEventCallback<T extends WaitDisplayEventType> = (
  data: WaitDisplayEvents[T],
) => void;
