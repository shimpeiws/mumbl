/**
 * Configuration types for mumbl
 */
import type { Provider } from '../services/llm/types.js';

/**
 * Wait display configuration
 */
export interface WaitDisplayConfigOptions {
  /** Whether the wait display is enabled */
  enabled?: boolean;
  /** Minimum wait time in ms before showing the display (default: 500ms) */
  minWaitTimeMs?: number;
}

/**
 * User-configurable options
 */
export interface MumblConfig {
  model?: string;
  provider?: Provider;
  baseUrl?: string;
  /** Wait display configuration */
  waitDisplay?: WaitDisplayConfigOptions;
}

/**
 * Resolved wait display configuration with all required fields
 */
export interface ResolvedWaitDisplayConfig {
  enabled: boolean;
  minWaitTimeMs: number;
}

/**
 * Fully resolved configuration with all required fields
 */
export interface ResolvedConfig {
  model: string;
  provider: Provider;
  baseUrl?: string;
  apiKey?: string;
  waitDisplay: ResolvedWaitDisplayConfig;
}

/**
 * Configuration from different sources
 */
export interface ConfigSource {
  cli: Partial<MumblConfig>;
  env: Partial<MumblConfig>;
  file: Partial<MumblConfig>;
}
