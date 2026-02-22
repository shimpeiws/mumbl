import type { ResolvedConfig } from '../../config/types.js';
import type { ContextServiceInterface } from '../context/types.js';
import type { ConversationContext } from '../conversation/types.js';
import type { VocabularySet } from '../wordgrain/types.js';
import { createAnthropicProvider } from './anthropic-provider.js';
import { ProviderUnavailableError } from './errors.js';
import {
  type MessageHistoryInterface,
  type SessionMessageHistoryInterface,
  createMessageHistory,
  createSessionMessageHistory,
} from './message-history.js';
import { createOllamaProvider } from './ollama-provider.js';
import {
  type ReactionPromptOptions,
  createChatMessages,
  createContextualChatMessages,
  createReactionPrompt,
  createReflectionPrompt,
  createSummaryPrompt,
} from './prompts.js';
/**
 * High-level LLM service for mumbl
 */
import type { ChatResponse, LLMProvider, ModelConfig, Provider, StreamChunk } from './types.js';
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OLLAMA_MODEL } from './types.js';

export interface LLMServiceConfig {
  provider: Provider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: Provider;
}

/**
 * Create an LLM provider based on configuration
 */
export function createProvider(config: ModelConfig): LLMProvider {
  switch (config.provider) {
    case 'ollama':
      return createOllamaProvider(config);
    case 'anthropic':
      return createAnthropicProvider(config);
  }
}

/**
 * LLM service interface
 */
export interface LLMServiceInterface {
  chat(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean },
  ): Promise<ChatResponse>;
  chatWithContext(message: string, context: ConversationContext): Promise<ChatResponse>;
  stream(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean },
  ): AsyncIterable<StreamChunk>;
  summarize(entries: string[]): Promise<ChatResponse>;
  reflect(entry: string): Promise<ChatResponse>;
  react(entry: string, options?: ReactionPromptOptions): Promise<ChatResponse>;
  healthCheck(): Promise<{ primary: boolean; fallback?: boolean }>;
  clearHistory(sessionId?: string): void;
  getProviderInfo(): { provider: Provider; model: string };
  setContextService(service: ContextServiceInterface): void;
  setVocabulary(vocabulary: VocabularySet): void;
}

/**
 * Create a high-level LLM service with fallback support and conversation management
 */
export function createLLMService(config: LLMServiceConfig): LLMServiceInterface {
  const primaryConfig: ModelConfig = {
    provider: config.provider,
    model:
      config.model ??
      (config.provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_ANTHROPIC_MODEL),
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };

  const primaryProvider = createProvider(primaryConfig);

  let fallbackProvider: LLMProvider | undefined;
  if (config.fallbackProvider) {
    const fallbackConfig: ModelConfig = {
      provider: config.fallbackProvider,
      model: config.fallbackProvider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_ANTHROPIC_MODEL,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };
    fallbackProvider = createProvider(fallbackConfig);
  }

  const sessionHistory: SessionMessageHistoryInterface = createSessionMessageHistory();
  let contextService: ContextServiceInterface | undefined;

  const getUserContext = (): string | undefined => {
    if (!contextService) return undefined;
    const ctx = contextService.getContextForLLM();
    return ctx.length > 0 ? ctx : undefined;
  };

  let vocabulary: VocabularySet | undefined;

  const setVocabulary = (v: VocabularySet): void => {
    vocabulary = v;
  };

  const chat = async (
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean },
  ): Promise<ChatResponse> => {
    const sessionId = options?.sessionId ?? 'default';
    const includeHistory = options?.includeHistory ?? true;

    const history: MessageHistoryInterface = includeHistory
      ? sessionHistory.getSession(sessionId)
      : createMessageHistory(0);

    const messages = createChatMessages(
      userMessage,
      history.getMessages(),
      vocabulary,
      getUserContext(),
    );

    try {
      const response = await primaryProvider.chat(messages);

      // Add the user message and response to history
      history.add({ role: 'user', content: userMessage });
      history.add({ role: 'assistant', content: response.content });

      return response;
    } catch (error) {
      if (error instanceof ProviderUnavailableError && fallbackProvider) {
        const response = await fallbackProvider.chat(messages);

        history.add({ role: 'user', content: userMessage });
        history.add({ role: 'assistant', content: response.content });

        return response;
      }
      throw error;
    }
  };

  const chatWithContext = async (
    message: string,
    context: ConversationContext,
  ): Promise<ChatResponse> => {
    const messages = createContextualChatMessages(message, context, undefined, getUserContext());

    try {
      return await primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && fallbackProvider) {
        return await fallbackProvider.chat(messages);
      }
      throw error;
    }
  };

  async function* stream(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean },
  ): AsyncIterable<StreamChunk> {
    const sessionId = options?.sessionId ?? 'default';
    const includeHistory = options?.includeHistory ?? true;

    const history: MessageHistoryInterface = includeHistory
      ? sessionHistory.getSession(sessionId)
      : createMessageHistory(0);

    const messages = createChatMessages(
      userMessage,
      history.getMessages(),
      vocabulary,
      getUserContext(),
    );

    let fullResponse = '';

    try {
      for await (const chunk of primaryProvider.stream(messages)) {
        fullResponse += chunk.content;
        yield chunk;
      }
    } catch (error) {
      if (error instanceof ProviderUnavailableError && fallbackProvider) {
        fullResponse = '';
        for await (const chunk of fallbackProvider.stream(messages)) {
          fullResponse += chunk.content;
          yield chunk;
        }
      } else {
        throw error;
      }
    }

    // Add the user message and response to history after streaming completes
    history.add({ role: 'user', content: userMessage });
    history.add({ role: 'assistant', content: fullResponse });
  }

  const summarize = async (entries: string[]): Promise<ChatResponse> => {
    const messages = createSummaryPrompt(entries, vocabulary);

    try {
      return await primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && fallbackProvider) {
        return await fallbackProvider.chat(messages);
      }
      throw error;
    }
  };

  const reflect = async (entry: string): Promise<ChatResponse> => {
    const messages = createReflectionPrompt(entry, vocabulary);

    try {
      return await primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && fallbackProvider) {
        return await fallbackProvider.chat(messages);
      }
      throw error;
    }
  };

  const react = async (entry: string, options?: ReactionPromptOptions): Promise<ChatResponse> => {
    const messages = createReactionPrompt(entry, options, vocabulary);

    try {
      return await primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && fallbackProvider) {
        return await fallbackProvider.chat(messages);
      }
      throw error;
    }
  };

  const healthCheck = async (): Promise<{ primary: boolean; fallback?: boolean }> => {
    const primaryHealth = await primaryProvider.healthCheck();
    const fallbackHealth = fallbackProvider ? await fallbackProvider.healthCheck() : undefined;

    return {
      primary: primaryHealth,
      fallback: fallbackHealth,
    };
  };

  const clearHistory = (sessionId?: string): void => {
    if (sessionId) {
      sessionHistory.clearSession(sessionId);
    } else {
      sessionHistory.clearAll();
    }
  };

  const getProviderInfo = (): { provider: Provider; model: string } => {
    return {
      provider: primaryProvider.getProviderName(),
      model: primaryProvider.getModelName(),
    };
  };

  const setContextServiceFn = (service: ContextServiceInterface): void => {
    contextService = service;
  };

  return {
    chat,
    chatWithContext,
    stream,
    summarize,
    reflect,
    react,
    healthCheck,
    clearHistory,
    getProviderInfo,
    setContextService: setContextServiceFn,
    setVocabulary,
  };
}

/**
 * Create an LLM service from resolved configuration
 * Use this with resolveConfig() for full configuration priority support
 * Priority: CLI > Environment > Config file > Default
 */
export function createLLMServiceFromConfig(config: ResolvedConfig): LLMServiceInterface {
  return createLLMService({
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    fallbackProvider: config.provider === 'ollama' && config.apiKey ? 'anthropic' : undefined,
  });
}
