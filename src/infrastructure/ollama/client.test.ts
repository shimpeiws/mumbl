import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OllamaConnectionError } from '../errors/OllamaErrors.js';
import {
  checkOllamaHealth,
  getOllamaClient,
  getOllamaClientConfig,
  initializeOllamaClient,
  isModelAvailable,
  listModels,
  resetOllamaClient,
} from './client.js';

// Mock the ollama package
vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockResolvedValue({
      models: [
        {
          name: 'qwen2.5-coder:7b',
          modified_at: '2024-01-15T10:30:00Z',
          size: 4500000000,
          digest: 'abc123',
          details: {
            format: 'gguf',
            family: 'qwen2',
            parameter_size: '7B',
            quantization_level: 'Q4_K_M',
          },
        },
        {
          name: 'llama2:latest',
          modified_at: '2024-01-10T08:00:00Z',
          size: 3800000000,
          digest: 'def456',
        },
      ],
    }),
  })),
}));

describe('Ollama Client', () => {
  beforeEach(() => {
    resetOllamaClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetOllamaClient();
  });

  describe('initializeOllamaClient', () => {
    it('should create a new Ollama client', async () => {
      const { Ollama } = await import('ollama');

      initializeOllamaClient();

      expect(Ollama).toHaveBeenCalledWith({
        host: 'http://localhost:11434',
      });
    });

    it('should accept custom configuration', async () => {
      const { Ollama } = await import('ollama');

      initializeOllamaClient({ baseUrl: 'http://custom:8080' });

      expect(Ollama).toHaveBeenCalledWith({
        host: 'http://custom:8080',
      });
    });
  });

  describe('getOllamaClient', () => {
    it('should return singleton instance', () => {
      const client1 = getOllamaClient();
      const client2 = getOllamaClient();

      expect(client1).toBe(client2);
    });
  });

  describe('getOllamaClientConfig', () => {
    it('should return default config when not initialized', () => {
      const config = getOllamaClientConfig();

      expect(config.baseUrl).toBe('http://localhost:11434');
      expect(config.defaultModel).toBe('qwen2.5-coder:7b');
    });

    it('should return custom config after initialization', () => {
      initializeOllamaClient({
        baseUrl: 'http://remote:11434',
        defaultModel: 'llama2:latest',
      });

      const config = getOllamaClientConfig();

      expect(config.baseUrl).toBe('http://remote:11434');
      expect(config.defaultModel).toBe('llama2:latest');
    });
  });

  describe('checkOllamaHealth', () => {
    it('should return connected status when Ollama is available', async () => {
      const health = await checkOllamaHealth();

      expect(health.isConnected).toBe(true);
      expect(health.baseUrl).toBe('http://localhost:11434');
      expect(health.error).toBeUndefined();
    });

    it('should return disconnected status when Ollama is unavailable', async () => {
      const { Ollama } = await import('ollama');
      vi.mocked(Ollama).mockImplementationOnce(
        () =>
          ({
            list: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }) as ReturnType<typeof Ollama>,
      );

      resetOllamaClient();
      const health = await checkOllamaHealth();

      expect(health.isConnected).toBe(false);
      expect(health.error).toContain('Connection refused');
    });
  });

  describe('listModels', () => {
    it('should return list of models with correct properties', async () => {
      const models = await listModels();

      expect(models).toHaveLength(2);
      expect(models[0]).toMatchObject({
        name: 'qwen2.5-coder:7b',
        size: 4500000000,
        digest: 'abc123',
      });
      expect(models[0]?.details).toMatchObject({
        format: 'gguf',
        family: 'qwen2',
        parameterSize: '7B',
        quantizationLevel: 'Q4_K_M',
      });
    });

    it('should handle models without details', async () => {
      const models = await listModels();

      expect(models[1]?.details).toBeUndefined();
    });

    it('should throw OllamaConnectionError when connection fails', async () => {
      const { Ollama } = await import('ollama');
      vi.mocked(Ollama).mockImplementationOnce(
        () =>
          ({
            list: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }) as ReturnType<typeof Ollama>,
      );

      resetOllamaClient();

      await expect(listModels()).rejects.toThrow(OllamaConnectionError);
    });
  });

  describe('isModelAvailable', () => {
    it('should return true for available model (exact match)', async () => {
      const available = await isModelAvailable('qwen2.5-coder:7b');

      expect(available).toBe(true);
    });

    it('should return true for default model when no argument', async () => {
      const available = await isModelAvailable();

      expect(available).toBe(true);
    });

    it('should return false for unavailable model', async () => {
      const available = await isModelAvailable('nonexistent:model');

      expect(available).toBe(false);
    });

    it('should return false when connection fails', async () => {
      const { Ollama } = await import('ollama');
      vi.mocked(Ollama).mockImplementationOnce(
        () =>
          ({
            list: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }) as ReturnType<typeof Ollama>,
      );

      resetOllamaClient();
      const available = await isModelAvailable('qwen2.5-coder:7b');

      expect(available).toBe(false);
    });
  });

  describe('resetOllamaClient', () => {
    it('should reset client and config', () => {
      initializeOllamaClient({ baseUrl: 'http://custom:8080' });
      const configBefore = getOllamaClientConfig();
      expect(configBefore.baseUrl).toBe('http://custom:8080');

      resetOllamaClient();

      const configAfter = getOllamaClientConfig();
      expect(configAfter.baseUrl).toBe('http://localhost:11434');
    });
  });
});
