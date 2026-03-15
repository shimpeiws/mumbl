import { Ollama } from 'ollama';
import { OllamaConnectionError } from '../errors/OllamaErrors.js';
import { type OllamaConfig, getOllamaConfig } from './config.js';
import type { OllamaHealthStatus, OllamaModel } from './types.js';

/**
 * Singleton Ollama client instance
 */
let ollamaInstance: Ollama | null = null;
let currentConfig: OllamaConfig | null = null;

/**
 * Initialize Ollama client with configuration
 */
export function initializeOllamaClient(config?: Partial<OllamaConfig>): Ollama {
  const finalConfig = { ...getOllamaConfig(), ...config };

  ollamaInstance = new Ollama({
    host: finalConfig.baseUrl,
  });

  currentConfig = finalConfig;
  return ollamaInstance;
}

/**
 * Get singleton Ollama client instance
 */
export function getOllamaClient(): Ollama {
  if (!ollamaInstance) {
    ollamaInstance = initializeOllamaClient();
  }
  return ollamaInstance;
}

/**
 * Get current Ollama configuration
 */
export function getOllamaClientConfig(): OllamaConfig {
  if (!currentConfig) {
    currentConfig = getOllamaConfig();
  }
  return currentConfig;
}

/**
 * Check Ollama server health and connectivity
 */
export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  const config = getOllamaClientConfig();

  try {
    const client = getOllamaClient();
    // Use list() as a health check - it's lightweight and confirms API is working
    await client.list();

    return {
      isConnected: true,
      baseUrl: config.baseUrl,
    };
  } catch (error) {
    return {
      isConnected: false,
      baseUrl: config.baseUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all available models
 */
export async function listModels(): Promise<OllamaModel[]> {
  const client = getOllamaClient();
  const config = getOllamaClientConfig();

  try {
    const response = await client.list();
    return response.models.map((model) => ({
      name: model.name,
      modifiedAt: new Date(model.modified_at),
      size: model.size,
      digest: model.digest,
      details: model.details
        ? {
            format: model.details.format,
            family: model.details.family,
            parameterSize: model.details.parameter_size,
            quantizationLevel: model.details.quantization_level,
          }
        : undefined,
    }));
  } catch (error) {
    throw new OllamaConnectionError(config.baseUrl, error instanceof Error ? error : undefined);
  }
}

/**
 * Check if specific model is available
 */
export async function isModelAvailable(modelName?: string): Promise<boolean> {
  const config = getOllamaClientConfig();
  const targetModel = modelName ?? config.defaultModel;

  try {
    const models = await listModels();
    return models.some((m) => m.name === targetModel || m.name.startsWith(`${targetModel}:`));
  } catch {
    return false;
  }
}

/**
 * Reset Ollama client (for testing)
 */
export function resetOllamaClient(): void {
  ollamaInstance = null;
  currentConfig = null;
}
