/**
 * Ollama LLM Provider implementation using LangChain
 */
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { ProviderUnavailableError, StreamError } from './errors.js';
import type { ChatResponse, LLMProvider, Message, ModelConfig, StreamChunk } from './types.js';
import { DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL, DEFAULT_TEMPERATURE } from './types.js';

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
 * Create an Ollama LLM provider
 */
export function createOllamaProvider(config?: Partial<ModelConfig>): LLMProvider {
  const modelName = config?.model ?? DEFAULT_OLLAMA_MODEL;
  const baseUrl = config?.baseUrl ?? DEFAULT_OLLAMA_BASE_URL;
  const model = new ChatOllama({
    model: modelName,
    baseUrl,
    temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
    maxRetries: 2,
  });

  const chat = async (messages: Message[]): Promise<ChatResponse> => {
    try {
      const langchainMessages = convertMessages(messages);
      const response = await model.invoke(langchainMessages);

      return {
        content: typeof response.content === 'string' ? response.content : '',
        model: modelName,
        finishReason: 'stop',
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new ProviderUnavailableError('ollama', error);
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
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new ProviderUnavailableError('ollama', error);
        }
        throw new StreamError(`Streaming failed: ${error.message}`, error);
      }
      throw error;
    }
  }

  const healthCheck = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  };

  const getProviderName = (): 'ollama' => 'ollama';

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
 * @deprecated Use createOllamaProvider() instead
 */
export class OllamaProvider implements LLMProvider {
  private readonly _provider: LLMProvider;

  constructor(config?: Partial<ModelConfig>) {
    this._provider = createOllamaProvider(config);
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
