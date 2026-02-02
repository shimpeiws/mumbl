/**
 * Ollama LLM Provider implementation using LangChain
 */
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ProviderUnavailableError, StreamError } from './errors.js';
import type {
  LLMProvider,
  Message,
  ChatResponse,
  StreamChunk,
  ModelConfig,
} from './types.js';
import {
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_TEMPERATURE,
} from './types.js';

export class OllamaProvider implements LLMProvider {
  private model: ChatOllama;
  private modelName: string;

  constructor(config?: Partial<ModelConfig>) {
    this.modelName = config?.model ?? DEFAULT_OLLAMA_MODEL;
    this.model = new ChatOllama({
      model: this.modelName,
      baseUrl: config?.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
      temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
      maxRetries: 2,
    });
  }

  private convertMessages(messages: Message[]): BaseMessage[] {
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

  async chat(messages: Message[]): Promise<ChatResponse> {
    try {
      const langchainMessages = this.convertMessages(messages);
      const response = await this.model.invoke(langchainMessages);

      return {
        content: typeof response.content === 'string' ? response.content : '',
        model: this.modelName,
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
  }

  async *stream(messages: Message[]): AsyncIterable<StreamChunk> {
    try {
      const langchainMessages = this.convertMessages(messages);
      const stream = await this.model.stream(langchainMessages);

      for await (const chunk of stream) {
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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${DEFAULT_OLLAMA_BASE_URL}/api/tags`,
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getProviderName(): 'ollama' {
    return 'ollama';
  }

  getModelName(): string {
    return this.modelName;
  }
}
