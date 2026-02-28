/**
 * LLM Provider types and interfaces
 */

export type Provider = 'ollama';

export interface ModelConfig {
  provider: Provider;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  finishReason?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * Unified interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Send a chat message and get a response
   */
  chat(messages: Message[]): Promise<ChatResponse>;

  /**
   * Send a chat message and stream the response
   */
  stream(messages: Message[]): AsyncIterable<StreamChunk>;

  /**
   * Check if the provider is available and ready
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get the provider name
   */
  getProviderName(): Provider;

  /**
   * Get the current model name
   */
  getModelName(): string;
}

/**
 * Default configurations
 */
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5-coder:7b';
export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 2048;
