import type { ResolvedConfig } from '../../config/types.js';
import type { ContextServiceInterface } from '../context/types.js';
import type { ConversationContext } from '../conversation/types.js';
import type { DetectedLanguage } from '../language/types.js';
import type { VocabularySet } from '../wordgrain/types.js';
import {
  type MessageHistoryInterface,
  type SessionMessageHistoryInterface,
  createMessageHistory,
  createSessionMessageHistory,
} from './MessageHistory.js';
import { createOllamaProvider } from './OllamaProvider.js';
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
import { DEFAULT_OLLAMA_MODEL } from './types.js';

export interface LLMServiceConfig {
  provider: Provider;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Create an LLM provider based on configuration
 */
export function createProvider(config: ModelConfig): LLMProvider {
  return createOllamaProvider(config);
}

/**
 * LLM service interface
 */
export interface LLMServiceInterface {
  chat(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean; language?: DetectedLanguage },
  ): Promise<ChatResponse>;
  chatWithContext(
    message: string,
    context: ConversationContext,
    language?: DetectedLanguage,
  ): Promise<ChatResponse>;
  stream(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean; language?: DetectedLanguage },
  ): AsyncIterable<StreamChunk>;
  summarize(entries: string[], language?: DetectedLanguage): Promise<ChatResponse>;
  reflect(entry: string, language?: DetectedLanguage): Promise<ChatResponse>;
  react(entry: string, options?: ReactionPromptOptions): Promise<ChatResponse>;
  healthCheck(): Promise<{ primary: boolean }>;
  clearHistory(sessionId?: string): void;
  getProviderInfo(): { provider: Provider; model: string };
  setContextService(service: ContextServiceInterface): void;
  setVocabulary(vocabulary: VocabularySet): void;
}

/**
 * Create a high-level LLM service with conversation management
 */
export function createLLMService(config: LLMServiceConfig): LLMServiceInterface {
  const primaryConfig: ModelConfig = {
    provider: config.provider,
    model: config.model ?? DEFAULT_OLLAMA_MODEL,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };

  const primaryProvider = createProvider(primaryConfig);

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
    options?: { sessionId?: string; includeHistory?: boolean; language?: DetectedLanguage },
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
      options?.language,
    );

    const response = await primaryProvider.chat(messages);

    // Add the user message and response to history
    history.add({ role: 'user', content: userMessage });
    history.add({ role: 'assistant', content: response.content });

    return response;
  };

  const chatWithContext = async (
    message: string,
    context: ConversationContext,
    language?: DetectedLanguage,
  ): Promise<ChatResponse> => {
    const messages = createContextualChatMessages(
      message,
      context,
      undefined,
      getUserContext(),
      language,
    );

    return await primaryProvider.chat(messages);
  };

  async function* stream(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean; language?: DetectedLanguage },
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
      options?.language,
    );

    let fullResponse = '';

    for await (const chunk of primaryProvider.stream(messages)) {
      fullResponse += chunk.content;
      yield chunk;
    }

    // Add the user message and response to history after streaming completes
    history.add({ role: 'user', content: userMessage });
    history.add({ role: 'assistant', content: fullResponse });
  }

  const summarize = async (
    entries: string[],
    language?: DetectedLanguage,
  ): Promise<ChatResponse> => {
    const messages = createSummaryPrompt(entries, vocabulary, language);
    return await primaryProvider.chat(messages);
  };

  const reflect = async (entry: string, language?: DetectedLanguage): Promise<ChatResponse> => {
    const messages = createReflectionPrompt(entry, vocabulary, language);
    return await primaryProvider.chat(messages);
  };

  const react = async (entry: string, options?: ReactionPromptOptions): Promise<ChatResponse> => {
    const messages = createReactionPrompt(entry, options, vocabulary);
    return await primaryProvider.chat(messages);
  };

  const healthCheck = async (): Promise<{ primary: boolean }> => {
    const primaryHealth = await primaryProvider.healthCheck();
    return { primary: primaryHealth };
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
  });
}
