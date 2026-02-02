/**
 * Default Ollama server base URL
 */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

/**
 * Default model for LLM operations
 */
export const DEFAULT_MODEL = 'qwen2.5-coder:7b';

/**
 * Default connection timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Ollama configuration interface
 */
export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeout: number;
}

/**
 * Get Ollama configuration from environment variables or defaults
 */
export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env['MUMBL_OLLAMA_URL'] ?? DEFAULT_OLLAMA_BASE_URL,
    defaultModel: process.env['MUMBL_OLLAMA_MODEL'] ?? DEFAULT_MODEL,
    timeout: process.env['MUMBL_OLLAMA_TIMEOUT']
      ? Number.parseInt(process.env['MUMBL_OLLAMA_TIMEOUT'], 10)
      : DEFAULT_TIMEOUT,
  };
}
