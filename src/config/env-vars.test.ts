import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadEnvVars, getApiKey } from './env-vars.js';

describe('env-vars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadEnvVars', () => {
    it('should return empty object when no env vars set', () => {
      delete process.env['MUMBL_MODEL'];
      delete process.env['MUMBL_PROVIDER'];
      delete process.env['MUMBL_BASE_URL'];
      const result = loadEnvVars();
      expect(result).toEqual({});
    });

    it('should load MUMBL_MODEL', () => {
      process.env['MUMBL_MODEL'] = 'gpt-4';
      const result = loadEnvVars();
      expect(result.model).toBe('gpt-4');
    });

    it('should load MUMBL_PROVIDER with ollama', () => {
      process.env['MUMBL_PROVIDER'] = 'ollama';
      const result = loadEnvVars();
      expect(result.provider).toBe('ollama');
    });

    it('should load MUMBL_PROVIDER with anthropic', () => {
      process.env['MUMBL_PROVIDER'] = 'anthropic';
      const result = loadEnvVars();
      expect(result.provider).toBe('anthropic');
    });

    it('should ignore invalid MUMBL_PROVIDER values', () => {
      process.env['MUMBL_PROVIDER'] = 'invalid';
      const result = loadEnvVars();
      expect(result.provider).toBeUndefined();
    });

    it('should load MUMBL_BASE_URL', () => {
      process.env['MUMBL_BASE_URL'] = 'http://localhost:8080';
      const result = loadEnvVars();
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should load all env vars together', () => {
      process.env['MUMBL_MODEL'] = 'gpt-4';
      process.env['MUMBL_PROVIDER'] = 'anthropic';
      process.env['MUMBL_BASE_URL'] = 'http://localhost:8080';
      const result = loadEnvVars();
      expect(result.model).toBe('gpt-4');
      expect(result.provider).toBe('anthropic');
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should not include empty string values for model', () => {
      process.env['MUMBL_MODEL'] = '';
      const result = loadEnvVars();
      expect(result.model).toBeUndefined();
    });
  });

  describe('getApiKey', () => {
    it('should return undefined when ANTHROPIC_API_KEY not set', () => {
      delete process.env['ANTHROPIC_API_KEY'];
      const result = getApiKey();
      expect(result).toBeUndefined();
    });

    it('should return ANTHROPIC_API_KEY when set', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-test-key';
      const result = getApiKey();
      expect(result).toBe('sk-test-key');
    });
  });
});
