import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OllamaConnectionError,
  OllamaModelNotFoundError,
} from '../infrastructure/errors/ollama-errors.js';
import { OllamaService } from './ollama-service.js';

// Mock the client module
vi.mock('../infrastructure/ollama/client.js', () => ({
  checkOllamaHealth: vi.fn(),
  getOllamaClientConfig: vi.fn(),
  isModelAvailable: vi.fn(),
  listModels: vi.fn(),
}));

const mockConfig = {
  baseUrl: 'http://localhost:11434',
  defaultModel: 'qwen2.5-coder:7b',
  timeout: 30000,
};

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(async () => {
    service = new OllamaService();
    vi.clearAllMocks();

    // Reset mock implementation for getOllamaClientConfig
    const { getOllamaClientConfig } = await import('../infrastructure/ollama/client.js');
    vi.mocked(getOllamaClientConfig).mockReturnValue(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('should return health status from client', async () => {
      const { checkOllamaHealth } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });

      const health = await service.checkHealth();

      expect(health.isConnected).toBe(true);
      expect(health.baseUrl).toBe('http://localhost:11434');
    });
  });

  describe('ensureConnected', () => {
    it('should not throw when Ollama is connected', async () => {
      const { checkOllamaHealth } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });

      await expect(service.ensureConnected()).resolves.not.toThrow();
    });

    it('should throw OllamaConnectionError when disconnected', async () => {
      const { checkOllamaHealth } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: false,
        baseUrl: 'http://localhost:11434',
        error: 'Connection refused',
      });

      await expect(service.ensureConnected()).rejects.toThrow(OllamaConnectionError);
    });
  });

  describe('getAvailableModels', () => {
    it('should return models when connected', async () => {
      const { checkOllamaHealth, listModels } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });
      vi.mocked(listModels).mockResolvedValue([
        {
          name: 'qwen2.5-coder:7b',
          modifiedAt: new Date('2024-01-15'),
          size: 4500000000,
          digest: 'abc123',
        },
      ]);

      const models = await service.getAvailableModels();

      expect(models).toHaveLength(1);
      expect(models[0]?.name).toBe('qwen2.5-coder:7b');
    });

    it('should throw when not connected', async () => {
      const { checkOllamaHealth } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: false,
        baseUrl: 'http://localhost:11434',
        error: 'Connection refused',
      });

      await expect(service.getAvailableModels()).rejects.toThrow(OllamaConnectionError);
    });
  });

  describe('checkDefaultModel', () => {
    it('should return available when model is installed', async () => {
      const { checkOllamaHealth, isModelAvailable } = await import(
        '../infrastructure/ollama/client.js'
      );
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });
      vi.mocked(isModelAvailable).mockResolvedValue(true);

      const result = await service.checkDefaultModel();

      expect(result.isAvailable).toBe(true);
      expect(result.model).toBe('qwen2.5-coder:7b');
      expect(result.error).toBeUndefined();
    });

    it('should return unavailable when model is not installed', async () => {
      const { checkOllamaHealth, isModelAvailable } = await import(
        '../infrastructure/ollama/client.js'
      );
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });
      vi.mocked(isModelAvailable).mockResolvedValue(false);

      const result = await service.checkDefaultModel();

      expect(result.isAvailable).toBe(false);
      expect(result.error).toContain('is not installed');
    });

    it('should return unavailable when not connected', async () => {
      const { checkOllamaHealth } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: false,
        baseUrl: 'http://localhost:11434',
        error: 'Connection refused',
      });

      const result = await service.checkDefaultModel();

      expect(result.isAvailable).toBe(false);
      expect(result.error).toContain('Cannot connect');
    });
  });

  describe('ensureModelAvailable', () => {
    it('should not throw when model is available', async () => {
      const { checkOllamaHealth, isModelAvailable } = await import(
        '../infrastructure/ollama/client.js'
      );
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });
      vi.mocked(isModelAvailable).mockResolvedValue(true);

      await expect(service.ensureModelAvailable()).resolves.not.toThrow();
    });

    it('should throw OllamaModelNotFoundError when model not available', async () => {
      const { checkOllamaHealth, isModelAvailable } = await import(
        '../infrastructure/ollama/client.js'
      );
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: true,
        baseUrl: 'http://localhost:11434',
      });
      vi.mocked(isModelAvailable).mockResolvedValue(false);

      await expect(service.ensureModelAvailable('missing-model')).rejects.toThrow(
        OllamaModelNotFoundError,
      );
    });

    it('should throw OllamaConnectionError when not connected', async () => {
      const { checkOllamaHealth } = await import('../infrastructure/ollama/client.js');
      vi.mocked(checkOllamaHealth).mockResolvedValue({
        isConnected: false,
        baseUrl: 'http://localhost:11434',
        error: 'Connection refused',
      });

      await expect(service.ensureModelAvailable()).rejects.toThrow(OllamaConnectionError);
    });
  });

  describe('getDefaultModel', () => {
    it('should return configured default model', () => {
      const model = service.getDefaultModel();

      expect(model).toBe('qwen2.5-coder:7b');
    });
  });

  describe('getBaseUrl', () => {
    it('should return configured base URL', () => {
      const url = service.getBaseUrl();

      expect(url).toBe('http://localhost:11434');
    });
  });
});
