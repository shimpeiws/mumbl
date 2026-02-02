import {
  OllamaConnectionError,
  OllamaModelNotFoundError,
} from '../infrastructure/errors/ollama-errors.js';
import {
  checkOllamaHealth,
  getOllamaClientConfig,
  isModelAvailable,
  listModels,
} from '../infrastructure/ollama/client.js';
import type {
  ModelAvailabilityResult,
  OllamaHealthStatus,
  OllamaModel,
} from '../infrastructure/ollama/types.js';

/**
 * High-level Ollama service for LLM operations
 */
export class OllamaService {
  /**
   * Check if Ollama is available and healthy
   */
  async checkHealth(): Promise<OllamaHealthStatus> {
    return checkOllamaHealth();
  }

  /**
   * Ensure Ollama is connected, throwing if not
   */
  async ensureConnected(): Promise<void> {
    const health = await this.checkHealth();
    if (!health.isConnected) {
      throw new OllamaConnectionError(health.baseUrl);
    }
  }

  /**
   * Get list of available models
   */
  async getAvailableModels(): Promise<OllamaModel[]> {
    await this.ensureConnected();
    return listModels();
  }

  /**
   * Check if the default model is available
   */
  async checkDefaultModel(): Promise<ModelAvailabilityResult> {
    const config = getOllamaClientConfig();
    const health = await this.checkHealth();

    if (!health.isConnected) {
      return {
        isAvailable: false,
        model: config.defaultModel,
        error: `Cannot connect to Ollama: ${health.error}`,
      };
    }

    const available = await isModelAvailable();
    return {
      isAvailable: available,
      model: config.defaultModel,
      error: available ? undefined : `Model ${config.defaultModel} is not installed`,
    };
  }

  /**
   * Ensure model is available, throwing if not
   */
  async ensureModelAvailable(modelName?: string): Promise<void> {
    await this.ensureConnected();
    const config = getOllamaClientConfig();
    const targetModel = modelName ?? config.defaultModel;

    const available = await isModelAvailable(targetModel);
    if (!available) {
      throw new OllamaModelNotFoundError(targetModel);
    }
  }

  /**
   * Get the configured default model name
   */
  getDefaultModel(): string {
    return getOllamaClientConfig().defaultModel;
  }

  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return getOllamaClientConfig().baseUrl;
  }
}
