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
export { OllamaProvider } from './OllamaProvider.js';

// Message History
export { createMessageHistory, createSessionMessageHistory } from './MessageHistory.js';

// Prompts
export {
  MUMBL_SYSTEM_PROMPT,
  createChatMessages,
  createSummaryPrompt,
  createReflectionPrompt,
} from './prompts.js';

// Main Service
export type { LLMServiceConfig } from './LLMService.js';
export { createProvider, createLLMServiceFromConfig } from './LLMService.js';
