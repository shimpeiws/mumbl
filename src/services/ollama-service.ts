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
 * Check if Ollama is available and healthy
 */
const checkHealth = async (): Promise<OllamaHealthStatus> => {
  return checkOllamaHealth();
};

/**
 * Ensure Ollama is connected, throwing if not
 */
const ensureConnected = async (): Promise<void> => {
  const health = await checkHealth();
  if (!health.isConnected) {
    throw new OllamaConnectionError(health.baseUrl);
  }
};

/**
 * Get list of available models
 */
const getAvailableModels = async (): Promise<OllamaModel[]> => {
  await ensureConnected();
  return listModels();
};

/**
 * Check if the default model is available
 */
const checkDefaultModel = async (): Promise<ModelAvailabilityResult> => {
  const config = getOllamaClientConfig();
  const health = await checkHealth();

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
};

/**
 * Ensure model is available, throwing if not
 */
const ensureModelAvailable = async (modelName?: string): Promise<void> => {
  await ensureConnected();
  const config = getOllamaClientConfig();
  const targetModel = modelName ?? config.defaultModel;

  const available = await isModelAvailable(targetModel);
  if (!available) {
    throw new OllamaModelNotFoundError(targetModel);
  }
};

/**
 * Get the configured default model name
 */
const getDefaultModel = (): string => {
  return getOllamaClientConfig().defaultModel;
};

/**
 * Get the configured base URL
 */
const getBaseUrl = (): string => {
  return getOllamaClientConfig().baseUrl;
};

/**
 * High-level Ollama service for LLM operations
 */
export const ollamaService = {
  checkHealth,
  ensureConnected,
  getAvailableModels,
  checkDefaultModel,
  ensureModelAvailable,
  getDefaultModel,
  getBaseUrl,
};

export type OllamaService = typeof ollamaService;
