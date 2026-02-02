import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_TIMEOUT,
  getOllamaConfig,
} from './config.js';

describe('Ollama Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('default values', () => {
    it('should have correct default base URL', () => {
      expect(DEFAULT_OLLAMA_BASE_URL).toBe('http://localhost:11434');
    });

    it('should have correct default model', () => {
      expect(DEFAULT_MODEL).toBe('qwen2.5-coder:7b');
    });

    it('should have correct default timeout', () => {
      expect(DEFAULT_TIMEOUT).toBe(30000);
    });
  });

  describe('getOllamaConfig', () => {
    it('should return default values when no env vars are set', () => {
      delete process.env.MUMBL_OLLAMA_URL;
      delete process.env.MUMBL_OLLAMA_MODEL;
      delete process.env.MUMBL_OLLAMA_TIMEOUT;

      const config = getOllamaConfig();

      expect(config.baseUrl).toBe(DEFAULT_OLLAMA_BASE_URL);
      expect(config.defaultModel).toBe(DEFAULT_MODEL);
      expect(config.timeout).toBe(DEFAULT_TIMEOUT);
    });

    it('should use MUMBL_OLLAMA_URL when set', () => {
      process.env.MUMBL_OLLAMA_URL = 'http://custom:8080';

      const config = getOllamaConfig();

      expect(config.baseUrl).toBe('http://custom:8080');
    });

    it('should use MUMBL_OLLAMA_MODEL when set', () => {
      process.env.MUMBL_OLLAMA_MODEL = 'llama2:latest';

      const config = getOllamaConfig();

      expect(config.defaultModel).toBe('llama2:latest');
    });

    it('should use MUMBL_OLLAMA_TIMEOUT when set', () => {
      process.env.MUMBL_OLLAMA_TIMEOUT = '60000';

      const config = getOllamaConfig();

      expect(config.timeout).toBe(60000);
    });

    it('should handle all env vars set together', () => {
      process.env.MUMBL_OLLAMA_URL = 'http://remote:11434';
      process.env.MUMBL_OLLAMA_MODEL = 'codellama:13b';
      process.env.MUMBL_OLLAMA_TIMEOUT = '45000';

      const config = getOllamaConfig();

      expect(config.baseUrl).toBe('http://remote:11434');
      expect(config.defaultModel).toBe('codellama:13b');
      expect(config.timeout).toBe(45000);
    });
  });
});
