import type { ResolvedConfig } from '../../config/types.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { ProviderUnavailableError } from './errors.js';
import { MessageHistory, SessionMessageHistory } from './message-history.js';
import { OllamaProvider } from './ollama-provider.js';
import {
  createChatMessages,
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
      return new OllamaProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
  }
}

/**
 * High-level LLM service with fallback support and conversation management
 */
export class LLMService {
  private primaryProvider: LLMProvider;
  private fallbackProvider?: LLMProvider;
  private sessionHistory: SessionMessageHistory;

  constructor(config: LLMServiceConfig) {
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

    this.primaryProvider = createProvider(primaryConfig);

    if (config.fallbackProvider) {
      const fallbackConfig: ModelConfig = {
        provider: config.fallbackProvider,
        model:
          config.fallbackProvider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_ANTHROPIC_MODEL,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      };
      this.fallbackProvider = createProvider(fallbackConfig);
    }

    this.sessionHistory = new SessionMessageHistory();
  }

  /**
   * Send a chat message and get a response
   * Automatically handles conversation history
   */
  async chat(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean },
  ): Promise<ChatResponse> {
    const sessionId = options?.sessionId ?? 'default';
    const includeHistory = options?.includeHistory ?? true;

    const history = includeHistory
      ? this.sessionHistory.getSession(sessionId)
      : new MessageHistory(0);

    const messages = createChatMessages(userMessage, history.getMessages());

    try {
      const response = await this.primaryProvider.chat(messages);

      // Add the user message and response to history
      history.add({ role: 'user', content: userMessage });
      history.add({ role: 'assistant', content: response.content });

      return response;
    } catch (error) {
      if (error instanceof ProviderUnavailableError && this.fallbackProvider) {
        const response = await this.fallbackProvider.chat(messages);

        history.add({ role: 'user', content: userMessage });
        history.add({ role: 'assistant', content: response.content });

        return response;
      }
      throw error;
    }
  }

  /**
   * Stream a chat response
   * Automatically handles conversation history
   */
  async *stream(
    userMessage: string,
    options?: { sessionId?: string; includeHistory?: boolean },
  ): AsyncIterable<StreamChunk> {
    const sessionId = options?.sessionId ?? 'default';
    const includeHistory = options?.includeHistory ?? true;

    const history = includeHistory
      ? this.sessionHistory.getSession(sessionId)
      : new MessageHistory(0);

    const messages = createChatMessages(userMessage, history.getMessages());

    let fullResponse = '';

    try {
      for await (const chunk of this.primaryProvider.stream(messages)) {
        fullResponse += chunk.content;
        yield chunk;
      }
    } catch (error) {
      if (error instanceof ProviderUnavailableError && this.fallbackProvider) {
        fullResponse = '';
        for await (const chunk of this.fallbackProvider.stream(messages)) {
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

  /**
   * Summarize journal entries
   */
  async summarize(entries: string[]): Promise<ChatResponse> {
    const messages = createSummaryPrompt(entries);

    try {
      return await this.primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && this.fallbackProvider) {
        return await this.fallbackProvider.chat(messages);
      }
      throw error;
    }
  }

  /**
   * Get a reflection on a journal entry
   */
  async reflect(entry: string): Promise<ChatResponse> {
    const messages = createReflectionPrompt(entry);

    try {
      return await this.primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && this.fallbackProvider) {
        return await this.fallbackProvider.chat(messages);
      }
      throw error;
    }
  }

  /**
   * Generate a minimal reaction to a journal entry
   * Returns a very brief acknowledgment (usually 1-3 words)
   */
  async react(entry: string): Promise<ChatResponse> {
    const messages = createReactionPrompt(entry);

    try {
      return await this.primaryProvider.chat(messages);
    } catch (error) {
      if (error instanceof ProviderUnavailableError && this.fallbackProvider) {
        return await this.fallbackProvider.chat(messages);
      }
      throw error;
    }
  }

  /**
   * Check if the primary provider is available
   */
  async healthCheck(): Promise<{ primary: boolean; fallback?: boolean }> {
    const primaryHealth = await this.primaryProvider.healthCheck();
    const fallbackHealth = this.fallbackProvider
      ? await this.fallbackProvider.healthCheck()
      : undefined;

    return {
      primary: primaryHealth,
      fallback: fallbackHealth,
    };
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(sessionId?: string): void {
    if (sessionId) {
      this.sessionHistory.clearSession(sessionId);
    } else {
      this.sessionHistory.clearAll();
    }
  }

  /**
   * Get the current provider information
   */
  getProviderInfo(): { provider: Provider; model: string } {
    return {
      provider: this.primaryProvider.getProviderName(),
      model: this.primaryProvider.getModelName(),
    };
  }
}

/**
 * Create an LLM service from resolved configuration
 * Use this with resolveConfig() for full configuration priority support
 * Priority: CLI > Environment > Config file > Default
 */
export function createLLMServiceFromConfig(config: ResolvedConfig): LLMService {
  return new LLMService({
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    fallbackProvider: config.provider === 'ollama' && config.apiKey ? 'anthropic' : undefined,
  });
}
