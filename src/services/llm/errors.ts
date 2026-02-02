/**
 * LLM-related error classes
 */

/**
 * Base error class for all LLM-related errors
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Thrown when the LLM provider is unavailable
 */
export class ProviderUnavailableError extends LLMError {
  constructor(provider: string, cause?: Error) {
    super(`LLM provider unavailable: ${provider}`, cause);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Thrown when model is not found or unavailable
 */
export class ModelNotFoundError extends LLMError {
  constructor(model: string, provider: string) {
    super(`Model not found: ${model} on provider ${provider}`);
    this.name = 'ModelNotFoundError';
  }
}

/**
 * Thrown when API key is missing or invalid
 */
export class AuthenticationError extends LLMError {
  constructor(provider: string) {
    super(`Authentication failed for provider: ${provider}`);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends LLMError {
  constructor(provider: string, retryAfter?: number) {
    const message = retryAfter
      ? `Rate limit exceeded for ${provider}. Retry after ${retryAfter} seconds.`
      : `Rate limit exceeded for ${provider}`;
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when streaming fails
 */
export class StreamError extends LLMError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'StreamError';
  }
}
