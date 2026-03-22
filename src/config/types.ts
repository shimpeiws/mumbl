/**
 * Configuration types for mumbl
 */
import type { Provider } from '../services/llm/types.js';

/**
 * Feature flags for experimental features
 */
export interface MumblFeatures {
  barQuote?: boolean;
}

/**
 * User-configurable options
 */
export interface MumblConfig {
  model?: string;
  provider?: Provider;
  baseUrl?: string;
  wordgrainFile?: string;
  features?: MumblFeatures;
}

/**
 * Fully resolved configuration with all required fields
 */
export interface ResolvedConfig {
  model: string;
  provider: Provider;
  baseUrl?: string;
  wordgrainFile?: string;
  features: MumblFeatures;
}

/**
 * Configuration from different sources
 */
export interface ConfigSource {
  cli: Partial<MumblConfig>;
  env: Partial<MumblConfig>;
  file: Partial<MumblConfig>;
}
