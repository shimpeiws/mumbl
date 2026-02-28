/**
 * Configuration types for mumbl
 */
import type { Provider } from '../services/llm/types.js';

/**
 * User-configurable options
 */
export interface MumblConfig {
  model?: string;
  provider?: Provider;
  baseUrl?: string;
  wordgrainFiles?: string[];
}

/**
 * Fully resolved configuration with all required fields
 */
export interface ResolvedConfig {
  model: string;
  provider: Provider;
  baseUrl?: string;
  wordgrainFiles?: string[];
}

/**
 * Configuration from different sources
 */
export interface ConfigSource {
  cli: Partial<MumblConfig>;
  env: Partial<MumblConfig>;
  file: Partial<MumblConfig>;
}
