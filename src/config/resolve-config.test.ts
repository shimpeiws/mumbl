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
    vi.mocked(envVars.getApiKey).mockReturnValue(undefined);
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

    it('should use anthropic default model for anthropic provider', () => {
      vi.mocked(cliArgs.parseCliArgs).mockReturnValue({ provider: 'anthropic' });
      const result = resolveConfig();
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4-20250514');
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

    it('should prioritize CLI provider over env provider', () => {
      vi.mocked(cliArgs.parseCliArgs).mockReturnValue({ provider: 'anthropic' });
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ provider: 'ollama' });

      const result = resolveConfig();
      expect(result.provider).toBe('anthropic');
    });

    it('should prioritize env provider over file provider', () => {
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ provider: 'anthropic' });
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ provider: 'ollama' });

      const result = resolveConfig();
      expect(result.provider).toBe('anthropic');
    });

    it('should use file provider when no CLI or env', () => {
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ provider: 'anthropic' });

      const result = resolveConfig();
      expect(result.provider).toBe('anthropic');
    });

    it('should prioritize CLI baseUrl over env baseUrl', () => {
      vi.mocked(cliArgs.parseCliArgs).mockReturnValue({ baseUrl: 'http://cli:8080' });
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ baseUrl: 'http://env:8080' });

      const result = resolveConfig();
      expect(result.baseUrl).toBe('http://cli:8080');
    });
  });

  describe('API key handling', () => {
    it('should include API key from getApiKey', () => {
      vi.mocked(envVars.getApiKey).mockReturnValue('sk-test-key');

      const result = resolveConfig();
      expect(result.apiKey).toBe('sk-test-key');
    });

    it('should have undefined apiKey when not set', () => {
      const result = resolveConfig();
      expect(result.apiKey).toBeUndefined();
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
      vi.mocked(envVars.loadEnvVars).mockReturnValue({ provider: 'anthropic' });
      vi.mocked(configFile.loadConfigFile).mockReturnValue({ baseUrl: 'http://file:8080' });
      vi.mocked(envVars.getApiKey).mockReturnValue('sk-test');

      const result = resolveConfig();
      expect(result.model).toBe('cli-model');
      expect(result.provider).toBe('anthropic');
      expect(result.baseUrl).toBe('http://file:8080');
      expect(result.apiKey).toBe('sk-test');
    });
  });
});
