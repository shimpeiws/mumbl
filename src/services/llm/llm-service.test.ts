import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnthropicProvider } from './anthropic-provider.js';
import { ProviderUnavailableError } from './errors.js';
import { type LLMServiceInterface, createLLMService, createProvider } from './llm-service.js';
import { createOllamaProvider } from './ollama-provider.js';
import type { ChatResponse, ModelConfig, StreamChunk } from './types.js';

// Mock the providers
vi.mock('./ollama-provider.js', () => ({
  createOllamaProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    stream: vi.fn(),
    healthCheck: vi.fn(),
    getProviderName: vi.fn().mockReturnValue('ollama'),
    getModelName: vi.fn().mockReturnValue('qwen2.5-coder:7b'),
  })),
}));

vi.mock('./anthropic-provider.js', () => ({
  createAnthropicProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    stream: vi.fn(),
    healthCheck: vi.fn(),
    getProviderName: vi.fn().mockReturnValue('anthropic'),
    getModelName: vi.fn().mockReturnValue('claude-sonnet-4-20250514'),
  })),
}));

describe('createProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an OllamaProvider for ollama config', () => {
    const config: ModelConfig = {
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
    };

    const provider = createProvider(config);

    expect(createOllamaProvider).toHaveBeenCalledWith(config);
    expect(provider.getProviderName()).toBe('ollama');
  });

  it('should create an AnthropicProvider for anthropic config', () => {
    const config: ModelConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'test-key',
    };

    const provider = createProvider(config);

    expect(createAnthropicProvider).toHaveBeenCalledWith(config);
    expect(provider.getProviderName()).toBe('anthropic');
  });
});

describe('LLMService', () => {
  let service: LLMServiceInterface;
  let mockOllamaChat: ReturnType<typeof vi.fn>;
  let mockOllamaStream: ReturnType<typeof vi.fn>;
  let mockOllamaHealthCheck: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOllamaChat = vi.fn().mockResolvedValue({
      content: 'Hello from Ollama',
      model: 'qwen2.5-coder:7b',
      finishReason: 'stop',
    } satisfies ChatResponse);

    mockOllamaStream = vi.fn().mockImplementation(async function* () {
      yield { content: 'Hello', done: false } satisfies StreamChunk;
      yield { content: ' world', done: false } satisfies StreamChunk;
      yield { content: '', done: true } satisfies StreamChunk;
    });

    mockOllamaHealthCheck = vi.fn().mockResolvedValue(true);

    vi.mocked(createOllamaProvider).mockImplementation(() => ({
      chat: mockOllamaChat,
      stream: mockOllamaStream,
      healthCheck: mockOllamaHealthCheck,
      getProviderName: vi.fn().mockReturnValue('ollama'),
      getModelName: vi.fn().mockReturnValue('qwen2.5-coder:7b'),
    }));

    service = createLLMService({
      provider: 'ollama',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('chat', () => {
    it('should send a chat message and return response', async () => {
      const response = await service.chat('Hello');

      expect(response.content).toBe('Hello from Ollama');
      expect(response.model).toBe('qwen2.5-coder:7b');
      expect(mockOllamaChat).toHaveBeenCalled();
    });

    it('should include conversation history in subsequent calls', async () => {
      await service.chat('First message', { sessionId: 'test' });
      await service.chat('Second message', { sessionId: 'test' });

      const calls = mockOllamaChat.mock.calls;
      // Second call should have more messages (including history)
      expect(calls[1][0].length).toBeGreaterThan(calls[0][0].length);
    });

    it('should not include history when includeHistory is false', async () => {
      await service.chat('First message', { sessionId: 'test' });
      await service.chat('Second message', { sessionId: 'test', includeHistory: false });

      const calls = mockOllamaChat.mock.calls;
      // Both calls should have same number of messages (system + user)
      expect(calls[0][0].length).toBe(calls[1][0].length);
    });

    it('should use different sessions for different session IDs', async () => {
      await service.chat('Session 1 message', { sessionId: 'session1' });
      await service.chat('Session 2 message', { sessionId: 'session2' });

      const calls = mockOllamaChat.mock.calls;
      // Both should have same number of messages since they are different sessions
      expect(calls[0][0].length).toBe(calls[1][0].length);
    });
  });

  describe('stream', () => {
    it('should stream chat responses', async () => {
      const chunks: StreamChunk[] = [];

      for await (const chunk of service.stream('Hello')) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(3);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[1].content).toBe(' world');
      expect(chunks[2].done).toBe(true);
    });

    it('should add messages to history after streaming', async () => {
      // First, stream a response
      const chunks: StreamChunk[] = [];
      for await (const chunk of service.stream('Hello', { sessionId: 'test' })) {
        chunks.push(chunk);
      }

      // Then make another chat call to verify history is updated
      await service.chat('Follow up', { sessionId: 'test' });

      const calls = mockOllamaChat.mock.calls;
      // The chat call should include the streamed conversation in history
      expect(calls[0][0].length).toBeGreaterThan(2);
    });
  });

  describe('healthCheck', () => {
    it('should return health status for primary provider', async () => {
      const health = await service.healthCheck();

      expect(health.primary).toBe(true);
      expect(health.fallback).toBeUndefined();
    });

    it('should return health status for both providers when fallback is configured', async () => {
      const mockAnthropicHealthCheck = vi.fn().mockResolvedValue(true);

      vi.mocked(createAnthropicProvider).mockImplementation(() => ({
        chat: vi.fn(),
        stream: vi.fn(),
        healthCheck: mockAnthropicHealthCheck,
        getProviderName: vi.fn().mockReturnValue('anthropic'),
        getModelName: vi.fn().mockReturnValue('claude-sonnet-4-20250514'),
      }));

      const serviceWithFallback = createLLMService({
        provider: 'ollama',
        fallbackProvider: 'anthropic',
        apiKey: 'test-key',
      });

      const health = await serviceWithFallback.healthCheck();

      expect(health.primary).toBe(true);
      expect(health.fallback).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear history for a specific session', async () => {
      await service.chat('Message 1', { sessionId: 'test' });
      service.clearHistory('test');
      await service.chat('Message 2', { sessionId: 'test' });

      const calls = mockOllamaChat.mock.calls;
      // Both calls should have same number of messages since history was cleared
      expect(calls[0][0].length).toBe(calls[1][0].length);
    });

    it('should clear all sessions when no session ID provided', async () => {
      await service.chat('Session 1', { sessionId: 'session1' });
      await service.chat('Session 2', { sessionId: 'session2' });

      service.clearHistory();

      await service.chat('New message 1', { sessionId: 'session1' });
      await service.chat('New message 2', { sessionId: 'session2' });

      const calls = mockOllamaChat.mock.calls;
      // All calls should have same base message count
      expect(calls[2][0].length).toBe(2);
      expect(calls[3][0].length).toBe(2);
    });
  });

  describe('getProviderInfo', () => {
    it('should return provider and model information', () => {
      const info = service.getProviderInfo();

      expect(info.provider).toBe('ollama');
      expect(info.model).toBe('qwen2.5-coder:7b');
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback provider when primary fails', async () => {
      const mockAnthropicChat = vi.fn().mockResolvedValue({
        content: 'Hello from Anthropic',
        model: 'claude-sonnet-4-20250514',
        finishReason: 'end_turn',
      } satisfies ChatResponse);

      vi.mocked(createAnthropicProvider).mockImplementation(() => ({
        chat: mockAnthropicChat,
        stream: vi.fn(),
        healthCheck: vi.fn().mockResolvedValue(true),
        getProviderName: vi.fn().mockReturnValue('anthropic'),
        getModelName: vi.fn().mockReturnValue('claude-sonnet-4-20250514'),
      }));

      mockOllamaChat.mockRejectedValue(new ProviderUnavailableError('ollama'));

      const serviceWithFallback = createLLMService({
        provider: 'ollama',
        fallbackProvider: 'anthropic',
        apiKey: 'test-key',
      });

      const response = await serviceWithFallback.chat('Hello');

      expect(response.content).toBe('Hello from Anthropic');
      expect(mockAnthropicChat).toHaveBeenCalled();
    });

    it('should throw error when primary fails and no fallback', async () => {
      mockOllamaChat.mockRejectedValue(new ProviderUnavailableError('ollama'));

      await expect(service.chat('Hello')).rejects.toThrow(ProviderUnavailableError);
    });
  });

  describe('summarize', () => {
    it('should summarize journal entries', async () => {
      const entries = ['Entry 1', 'Entry 2', 'Entry 3'];

      const response = await service.summarize(entries);

      expect(response.content).toBe('Hello from Ollama');
      expect(mockOllamaChat).toHaveBeenCalled();
    });
  });

  describe('reflect', () => {
    it('should reflect on a journal entry', async () => {
      const entry = 'Today was a good day';

      const response = await service.reflect(entry);

      expect(response.content).toBe('Hello from Ollama');
      expect(mockOllamaChat).toHaveBeenCalled();
    });
  });
});
