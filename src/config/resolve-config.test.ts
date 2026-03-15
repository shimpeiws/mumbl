import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cliArgs from './cli-args.js';
import * as configFile from './config-file.js';
import * as envVars from './env-vars.js';
import { resolveConfig } from './resolve-config.js';

vi.mock('./cli-args.js');
vi.mock('./config-file.js');
vi.mock('./env-vars.js');

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cliArgs.parseCliArgs).mockReturnValue({});
    vi.mocked(configFile.loadConfigFile).mockReturnValue({});
    vi.mocked(envVars.loadEnvVars).mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default values', () => {
    it('should use default values when no config provided', () => {
      const result = resolveConfig();
      expect(result.provider).toBe('ollama');
      expect(result.model).toBe('qwen2.5-coder:7b');
    });
  });

  describe('priority: CLI > Env > File > Default', () => {
    it('should prioritize CLI model over env model', () => {
      vi.mocked(cliArgs.parseCliArgs).mockReturnValue({ model: 'cli-model' });
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ model: 'env-model' });
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ model: 'file-model' });

      const result = resolveConfig();
      expect(result.model).toBe('cli-model');
    });

    it('should prioritize env model over file model', () => {
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ model: 'env-model' });
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ model: 'file-model' });

      const result = resolveConfig();
      expect(result.model).toBe('env-model');
    });

    it('should use file model when no CLI or env', () => {
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ model: 'file-model' });

      const result = resolveConfig();
      expect(result.model).toBe('file-model');
    });

    it('should prioritize CLI baseUrl over env baseUrl', () => {
      vi.mocked(cliArgs.parseCliArgs).mockReturnValue({ baseUrl: 'http://cli:8080' });
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ baseUrl: 'http://env:8080' });

      const result = resolveConfig();
      expect(result.baseUrl).toBe('http://cli:8080');
    });
  });

  describe('provider', () => {
    it('should always use ollama as provider', () => {
      const result = resolveConfig();
      expect(result.provider).toBe('ollama');
    });
  });

  describe('CLI args parameter', () => {
    it('should pass cliArgs to parseCliArgs', () => {
      const args = ['--model', 'test-model'];
      resolveConfig(args);
      expect(cliArgs.parseCliArgs).toHaveBeenCalledWith(args);
    });

    it('should call parseCliArgs with undefined when no args provided', () => {
      resolveConfig();
      expect(cliArgs.parseCliArgs).toHaveBeenCalledWith(undefined);
    });
  });

  describe('combined scenarios', () => {
    it('should handle mixed config from all sources', () => {
      vi.mocked(cliArgs.parseCliArgs).mockReturnValue({ model: 'cli-model' });
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ baseUrl: 'http://file:8080' });

      const result = resolveConfig();
      expect(result.model).toBe('cli-model');
      expect(result.provider).toBe('ollama');
      expect(result.baseUrl).toBe('http://file:8080');
    });
  });

  describe('features', () => {
    it('should use default features when no config provided', () => {
      const result = resolveConfig();
      expect(result.features).toEqual({ barQuote: false });
    });

    it('should merge file features with defaults', () => {
      vi.mocked(configFile.loadConfigFile).mockReturnValue({
        features: { barQuote: true },
      });

      const result = resolveConfig();
      expect(result.features).toEqual({ barQuote: true });
    });

    it('should use default for missing feature flags', () => {
      vi.mocked(configFile.loadConfigFile).mockReturnValue({
        features: {},
      });

      const result = resolveConfig();
      expect(result.features).toEqual({ barQuote: false });
    });
  });
});
