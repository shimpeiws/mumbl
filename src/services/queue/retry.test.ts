import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderUnavailableError, RateLimitError } from '../llm/errors.js';
import { calculateBackoffDelay, shouldRetryError, sleep, withRetry } from './retry.js';
import type { RetryConfig } from './types.js';

describe('calculateBackoffDelay', () => {
  const config: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    multiplier: 2,
    maxDelayMs: 30000,
  };

  it('should calculate delay for first retry (attempt 0)', () => {
    // 1000 * 2^0 = 1000
    expect(calculateBackoffDelay(0, config)).toBe(1000);
  });

  it('should calculate delay for second retry (attempt 1)', () => {
    // 1000 * 2^1 = 2000
    expect(calculateBackoffDelay(1, config)).toBe(2000);
  });

  it('should calculate delay for third retry (attempt 2)', () => {
    // 1000 * 2^2 = 4000
    expect(calculateBackoffDelay(2, config)).toBe(4000);
  });

  it('should cap delay at maxDelayMs', () => {
    // 1000 * 2^10 = 1024000, but capped at 30000
    expect(calculateBackoffDelay(10, config)).toBe(30000);
  });

  it('should work with different configurations', () => {
    const customConfig: RetryConfig = {
      maxRetries: 5,
      baseDelayMs: 500,
      multiplier: 3,
      maxDelayMs: 10000,
    };
    // 500 * 3^2 = 4500
    expect(calculateBackoffDelay(2, customConfig)).toBe(4500);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after the specified time', async () => {
    const promise = sleep(1000);

    vi.advanceTimersByTime(999);
    await Promise.resolve(); // Let any pending promises resolve

    vi.advanceTimersByTime(1);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('shouldRetryError', () => {
  it('should return true for ProviderUnavailableError', () => {
    const error = new ProviderUnavailableError('ollama');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return true for RateLimitError', () => {
    const error = new RateLimitError('anthropic');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return true for connection refused errors', () => {
    const error = new Error('ECONNREFUSED');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return true for timeout errors', () => {
    const error = new Error('Request timeout');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return true for network errors', () => {
    const error = new Error('Network error occurred');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return true for ETIMEDOUT errors', () => {
    const error = new Error('ETIMEDOUT');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return true for ENOTFOUND errors', () => {
    const error = new Error('ENOTFOUND');
    expect(shouldRetryError(error)).toBe(true);
  });

  it('should return false for unknown errors', () => {
    const error = new Error('Some unknown error');
    expect(shouldRetryError(error)).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(shouldRetryError('string error')).toBe(false);
    expect(shouldRetryError(null)).toBe(false);
    expect(shouldRetryError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ProviderUnavailableError('ollama'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn);

    // Advance timer for backoff delay
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry multiple times before succeeding', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ProviderUnavailableError('ollama'))
      .mockRejectedValueOnce(new RateLimitError('anthropic'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn);

    // First retry: 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second retry: 2000ms
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries exceeded', async () => {
    const error = new ProviderUnavailableError('ollama');
    const fn = vi.fn().mockRejectedValue(error);

    // Wrap in a try-catch to properly handle the rejection
    let caughtError: Error | undefined;
    const promise = withRetry(fn, { maxRetries: 2 }).catch((e) => {
      caughtError = e;
    });

    // Retry delays: 1000, 2000
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(caughtError).toBeInstanceOf(ProviderUnavailableError);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const error = new Error('Authentication failed');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toThrow('Authentication failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use custom shouldRetry function', async () => {
    const error = new Error('Custom retryable error');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const customShouldRetry = (e: unknown) => e instanceof Error && e.message.includes('Custom');

    const promise = withRetry(fn, {}, customShouldRetry);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use custom retry config', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new ProviderUnavailableError('ollama'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { baseDelayMs: 500 });

    // Should use custom base delay of 500ms
    await vi.advanceTimersByTimeAsync(500);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
