/**
 * LLM service module
 * Provides LangChain-based LLM integration with provider abstraction
 */

// Types
export type {
  Provider,
  ModelConfig,
  Message,
  ChatResponse,
  StreamChunk,
  LLMProvider,
} from './types.js';

export {
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from './types.js';

// Errors
export {
  LLMError,
  ProviderUnavailableError,
  ModelNotFoundError,
  AuthenticationError,
  RateLimitError,
  StreamError,
} from './errors.js';

// Providers
export { OllamaProvider } from './ollama-provider.js';
export { AnthropicProvider } from './anthropic-provider.js';

// Message History
export { MessageHistory, SessionMessageHistory } from './message-history.js';

// Prompts
export {
  MUMBL_SYSTEM_PROMPT,
  createChatMessages,
  createSummaryPrompt,
  createReflectionPrompt,
} from './prompts.js';

// Main Service
export type { LLMServiceConfig } from './llm-service.js';
export { LLMService, createProvider, createDefaultLLMService } from './llm-service.js';
