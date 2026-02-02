/**
 * Anthropic LLM Provider implementation using LangChain
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { AuthenticationError, ProviderUnavailableError, StreamError } from './errors.js';
import type {
  LLMProvider,
  Message,
  ChatResponse,
  StreamChunk,
  ModelConfig,
} from './types.js';
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from './types.js';

export class AnthropicProvider implements LLMProvider {
  private model: ChatAnthropic;
  private modelName: string;

  constructor(config?: Partial<ModelConfig>) {
    const apiKey = config?.apiKey ?? process.env['ANTHROPIC_API_KEY'];

    if (!apiKey) {
      throw new AuthenticationError('anthropic');
    }

    this.modelName = config?.model ?? DEFAULT_ANTHROPIC_MODEL;
    this.model = new ChatAnthropic({
      model: this.modelName,
      anthropicApiKey: apiKey,
      temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
      maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
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

  async healthCheck(): Promise<boolean> {
    try {
      // For Anthropic, we can't easily check without making an API call
      // So we just verify that we have an API key configured
      return true;
    } catch {
      return false;
    }
  }

  getProviderName(): 'anthropic' {
    return 'anthropic';
  }

  getModelName(): string {
    return this.modelName;
  }
}
