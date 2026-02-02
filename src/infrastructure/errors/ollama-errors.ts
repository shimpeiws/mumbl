/**
 * Base error class for Ollama-related errors
 */
export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

/**
 * Thrown when Ollama server is not available
 */
export class OllamaConnectionError extends OllamaError {
  constructor(
    public readonly baseUrl: string,
    cause?: Error,
  ) {
    super(`Cannot connect to Ollama at ${baseUrl}`, cause);
    this.name = 'OllamaConnectionError';
  }
}

/**
 * Thrown when requested model is not available
 */
export class OllamaModelNotFoundError extends OllamaError {
  constructor(public readonly model: string) {
    super(`Model not available: ${model}`);
    this.name = 'OllamaModelNotFoundError';
  }
}

/**
 * Thrown when Ollama API request fails
 */
export class OllamaApiError extends OllamaError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: Error,
  ) {
    super(message, cause);
    this.name = 'OllamaApiError';
  }
}
