/**
 * Retry logic with exponential backoff
 */

import { ProviderUnavailableError, RateLimitError } from '../llm/errors.js';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types.js';

/**
 * Calculate backoff delay using exponential backoff formula
 * delay = min(baseDelay * (multiplier ^ retryCount), maxDelay)
 */
export function calculateBackoffDelay(retryCount: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * config.multiplier ** retryCount;
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Promise-based sleep function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error should trigger a retry
 */
export function shouldRetryError(error: unknown): boolean {
  if (error instanceof ProviderUnavailableError) return true;
  if (error instanceof RateLimitError) return true;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('econnrefused')) return true;
    if (message.includes('timeout')) return true;
    if (message.includes('network')) return true;
    if (message.includes('etimedout')) return true;
    if (message.includes('enotfound')) return true;
  }

  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry: (error: unknown) => boolean = shouldRetryError,
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Check if we've exhausted retries
      if (attempt >= fullConfig.maxRetries) {
        throw error;
      }

      // Calculate and wait for backoff delay
      const delay = calculateBackoffDelay(attempt, fullConfig);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
