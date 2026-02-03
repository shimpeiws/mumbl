import type { Provider } from '../services/llm/types.js';
/**
 * Environment variable loading for mumbl
 *
 * Supports:
 * - MUMBL_MODEL: Model name
 * - MUMBL_PROVIDER: Provider name ('ollama' | 'anthropic')
 * - MUMBL_BASE_URL: Base URL for the provider
 * - ANTHROPIC_API_KEY: API key for Anthropic
 */
import type { MumblConfig } from './types.js';

/**
 * Load configuration from environment variables
 * @returns Partial configuration from environment
 */
export function loadEnvVars(): Partial<MumblConfig> {
  const result: Partial<MumblConfig> = {};

  const model = process.env['MUMBL_MODEL'];
  if (model) {
    result.model = model;
  }

  const provider = process.env['MUMBL_PROVIDER'];
  if (provider === 'ollama' || provider === 'anthropic') {
    result.provider = provider as Provider;
  }

  const baseUrl = process.env['MUMBL_BASE_URL'];
  if (baseUrl) {
    result.baseUrl = baseUrl;
  }

  return result;
}

/**
 * Get Anthropic API key from environment
 * @returns API key or undefined
 */
export function getApiKey(): string | undefined {
  return process.env['ANTHROPIC_API_KEY'];
}
