import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadEnvVars } from './env-vars.js';

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
      delete process.env['MUMBL_BASE_URL'];
      const result = loadEnvVars();
      expect(result).toEqual({});
    });

    it('should load MUMBL_MODEL', () => {
      process.env['MUMBL_MODEL'] = 'llama2';
      const result = loadEnvVars();
      expect(result.model).toBe('llama2');
    });

    it('should load MUMBL_BASE_URL', () => {
      process.env['MUMBL_BASE_URL'] = 'http://localhost:8080';
      const result = loadEnvVars();
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should load all env vars together', () => {
      process.env['MUMBL_MODEL'] = 'llama2';
      process.env['MUMBL_BASE_URL'] = 'http://localhost:8080';
      const result = loadEnvVars();
      expect(result.model).toBe('llama2');
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should not include empty string values for model', () => {
      process.env['MUMBL_MODEL'] = '';
      const result = loadEnvVars();
      expect(result.model).toBeUndefined();
    });
  });
});
