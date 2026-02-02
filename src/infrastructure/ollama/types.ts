/**
 * Model details from Ollama
 */
export interface OllamaModelDetails {
  format: string;
  family: string;
  parameterSize: string;
  quantizationLevel: string;
}

/**
 * Model information returned by Ollama
 */
export interface OllamaModel {
  name: string;
  modifiedAt: Date;
  size: number;
  digest: string;
  details?: OllamaModelDetails;
}

/**
 * Ollama health status
 */
export interface OllamaHealthStatus {
  isConnected: boolean;
  baseUrl: string;
  error?: string;
}

/**
 * Model availability result
 */
export interface ModelAvailabilityResult {
  isAvailable: boolean;
  model: string;
  error?: string;
}
