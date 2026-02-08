/**
 * Anthropic LLM Provider implementation using LangChain
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { AuthenticationError, ProviderUnavailableError, StreamError } from './errors.js';
import type { ChatResponse, LLMProvider, Message, ModelConfig, StreamChunk } from './types.js';
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from './types.js';

/**
 * Convert messages to LangChain format
 */
function convertMessages(messages: Message[]): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content);
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
    }
  });
}

/**
 * Create an Anthropic LLM provider
 */
export function createAnthropicProvider(config?: Partial<ModelConfig>): LLMProvider {
  const apiKey = config?.apiKey ?? process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    throw new AuthenticationError('anthropic');
  }

  const modelName = config?.model ?? DEFAULT_ANTHROPIC_MODEL;
  const model = new ChatAnthropic({
    model: modelName,
    anthropicApiKey: apiKey,
    temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
  });

  const chat = async (messages: Message[]): Promise<ChatResponse> => {
    try {
      const langchainMessages = convertMessages(messages);
      const response = await model.invoke(langchainMessages);

      return {
        content: typeof response.content === 'string' ? response.content : '',
        model: modelName,
        finishReason: response.response_metadata?.['stop_reason'] as string | undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new AuthenticationError('anthropic');
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new ProviderUnavailableError('anthropic', error);
        }
      }
      throw error;
    }
  };

  async function* stream(messages: Message[]): AsyncIterable<StreamChunk> {
    try {
      const langchainMessages = convertMessages(messages);
      const streamResult = await model.stream(langchainMessages);

      for await (const chunk of streamResult) {
        const content = typeof chunk.content === 'string' ? chunk.content : '';
        yield {
          content,
          done: false,
        };
      }

      yield {
        content: '',
        done: true,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new AuthenticationError('anthropic');
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new ProviderUnavailableError('anthropic', error);
        }
        throw new StreamError(`Streaming failed: ${error.message}`, error);
      }
      throw error;
    }
  }

  const healthCheck = async (): Promise<boolean> => {
    // For Anthropic, we can't easily check without making an API call
    // So we just verify that we have an API key configured
    return true;
  };

  const getProviderName = (): 'anthropic' => 'anthropic';

  const getModelName = (): string => modelName;

  return {
    chat,
    stream,
    healthCheck,
    getProviderName,
    getModelName,
  };
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use createAnthropicProvider() instead
 */
export class AnthropicProvider implements LLMProvider {
  private readonly _provider: LLMProvider;

  constructor(config?: Partial<ModelConfig>) {
    this._provider = createAnthropicProvider(config);
  }

  chat(messages: Message[]) {
    return this._provider.chat(messages);
  }
  stream(messages: Message[]) {
    return this._provider.stream(messages);
  }
  healthCheck() {
    return this._provider.healthCheck();
  }
  getProviderName() {
    return this._provider.getProviderName();
  }
  getModelName() {
    return this._provider.getModelName();
  }
}
