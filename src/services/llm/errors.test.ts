import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  LLMError,
  ModelNotFoundError,
  ProviderUnavailableError,
  RateLimitError,
  StreamError,
} from './errors.js';

describe('LLMError', () => {
  it('should create an error with message', () => {
    const error = new LLMError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('LLMError');
    expect(error.cause).toBeUndefined();
  });

  it('should create an error with cause', () => {
    const cause = new Error('Original error');
    const error = new LLMError('Test error', cause);

    expect(error.message).toBe('Test error');
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of Error', () => {
    const error = new LLMError('Test error');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ProviderUnavailableError', () => {
  it('should create an error with provider name', () => {
    const error = new ProviderUnavailableError('ollama');

    expect(error.message).toBe('LLM provider unavailable: ollama');
    expect(error.name).toBe('ProviderUnavailableError');
  });

  it('should create an error with cause', () => {
    const cause = new Error('Connection refused');
    const error = new ProviderUnavailableError('anthropic', cause);

    expect(error.message).toBe('LLM provider unavailable: anthropic');
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of LLMError', () => {
    const error = new ProviderUnavailableError('ollama');
    expect(error).toBeInstanceOf(LLMError);
  });
});

describe('ModelNotFoundError', () => {
  it('should create an error with model and provider', () => {
    const error = new ModelNotFoundError('gpt-4', 'openai');

    expect(error.message).toBe('Model not found: gpt-4 on provider openai');
    expect(error.name).toBe('ModelNotFoundError');
  });

  it('should be an instance of LLMError', () => {
    const error = new ModelNotFoundError('model', 'provider');
    expect(error).toBeInstanceOf(LLMError);
  });
});

describe('AuthenticationError', () => {
  it('should create an error with provider name', () => {
    const error = new AuthenticationError('anthropic');

    expect(error.message).toBe('Authentication failed for provider: anthropic');
    expect(error.name).toBe('AuthenticationError');
  });

  it('should be an instance of LLMError', () => {
    const error = new AuthenticationError('provider');
    expect(error).toBeInstanceOf(LLMError);
  });
});

describe('RateLimitError', () => {
  it('should create an error with provider name', () => {
    const error = new RateLimitError('anthropic');

    expect(error.message).toBe('Rate limit exceeded for anthropic');
    expect(error.name).toBe('RateLimitError');
  });

  it('should create an error with retry after', () => {
    const error = new RateLimitError('anthropic', 60);

    expect(error.message).toBe('Rate limit exceeded for anthropic. Retry after 60 seconds.');
  });

  it('should be an instance of LLMError', () => {
    const error = new RateLimitError('provider');
    expect(error).toBeInstanceOf(LLMError);
  });
});

describe('StreamError', () => {
  it('should create an error with message', () => {
    const error = new StreamError('Stream interrupted');

    expect(error.message).toBe('Stream interrupted');
    expect(error.name).toBe('StreamError');
  });

  it('should create an error with cause', () => {
    const cause = new Error('Network error');
    const error = new StreamError('Stream failed', cause);

    expect(error.message).toBe('Stream failed');
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of LLMError', () => {
    const error = new StreamError('error');
    expect(error).toBeInstanceOf(LLMError);
  });
});
