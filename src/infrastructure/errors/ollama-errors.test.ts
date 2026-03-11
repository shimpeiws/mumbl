import { describe, expect, it } from 'vitest';
import {
  OllamaApiError,
  OllamaConnectionError,
  OllamaError,
  OllamaModelNotFoundError,
} from './ollama-errors.js';

describe('OllamaError', () => {
  it('should create error with message', () => {
    const error = new OllamaError('test');
    expect(error.message).toBe('test');
    expect(error.name).toBe('OllamaError');
    expect(error.cause).toBeUndefined();
  });

  it('should create error with cause', () => {
    const cause = new Error('original');
    const error = new OllamaError('test', cause);
    expect(error.cause).toBe(cause);
  });

  it('should be instance of Error', () => {
    expect(new OllamaError('test')).toBeInstanceOf(Error);
  });
});

describe('OllamaConnectionError', () => {
  it('should include baseUrl in message', () => {
    const error = new OllamaConnectionError('http://localhost:11434');
    expect(error.message).toBe('Cannot connect to Ollama at http://localhost:11434');
    expect(error.baseUrl).toBe('http://localhost:11434');
    expect(error.name).toBe('OllamaConnectionError');
  });

  it('should accept cause', () => {
    const cause = new Error('refused');
    const error = new OllamaConnectionError('http://localhost:11434', cause);
    expect(error.cause).toBe(cause);
  });

  it('should be instance of OllamaError', () => {
    expect(new OllamaConnectionError('url')).toBeInstanceOf(OllamaError);
  });
});

describe('OllamaModelNotFoundError', () => {
  it('should include model in message', () => {
    const error = new OllamaModelNotFoundError('llama3');
    expect(error.message).toBe('Model not available: llama3');
    expect(error.model).toBe('llama3');
    expect(error.name).toBe('OllamaModelNotFoundError');
  });

  it('should be instance of OllamaError', () => {
    expect(new OllamaModelNotFoundError('model')).toBeInstanceOf(OllamaError);
  });
});

describe('OllamaApiError', () => {
  it('should create with message and status code', () => {
    const error = new OllamaApiError('Bad request', 400);
    expect(error.message).toBe('Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('OllamaApiError');
  });

  it('should handle undefined status code', () => {
    const error = new OllamaApiError('Unknown error');
    expect(error.statusCode).toBeUndefined();
  });

  it('should accept cause', () => {
    const cause = new Error('original');
    const error = new OllamaApiError('error', 500, cause);
    expect(error.cause).toBe(cause);
  });

  it('should be instance of OllamaError', () => {
    expect(new OllamaApiError('error')).toBeInstanceOf(OllamaError);
  });
});
