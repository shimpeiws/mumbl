/**
 * Environment variable loading for mumbl
 *
 * Supports:
 * - MUMBL_MODEL: Model name
 * - MUMBL_BASE_URL: Base URL for the provider
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

  const baseUrl = process.env['MUMBL_BASE_URL'];
  if (baseUrl) {
    result.baseUrl = baseUrl;
  }

  return result;
}
