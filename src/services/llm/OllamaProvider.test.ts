import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderUnavailableError, StreamError } from './errors.js';

const mockInvoke = vi.fn();
const mockStream = vi.fn();

vi.mock('@langchain/ollama', () => {
  return {
    ChatOllama: class MockChatOllama {
      invoke = mockInvoke;
      stream = mockStream;
    },
  };
});

// Import after mock setup
const { createOllamaProvider, OllamaProvider } = await import('./OllamaProvider.js');

describe('createOllamaProvider', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockStream.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return provider with all methods', () => {
    const provider = createOllamaProvider();
    expect(provider.chat).toBeDefined();
    expect(provider.stream).toBeDefined();
    expect(provider.healthCheck).toBeDefined();
    expect(provider.getProviderName).toBeDefined();
    expect(provider.getModelName).toBeDefined();
  });

  it('should use default model name', () => {
    const provider = createOllamaProvider();
    expect(provider.getModelName()).toBe('qwen2.5-coder:7b');
  });

  it('should use custom model name', () => {
    const provider = createOllamaProvider({ model: 'llama3' });
    expect(provider.getModelName()).toBe('llama3');
  });

  it('should return ollama as provider name', () => {
    const provider = createOllamaProvider();
    expect(provider.getProviderName()).toBe('ollama');
  });

  describe('chat', () => {
    it('should convert messages and return response', async () => {
      mockInvoke.mockResolvedValue({ content: 'Hello back!' });
      const provider = createOllamaProvider();

      const result = await provider.chat([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);

      expect(result.content).toBe('Hello back!');
      expect(result.model).toBe('qwen2.5-coder:7b');
      expect(result.finishReason).toBe('stop');
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should handle non-string content', async () => {
      mockInvoke.mockResolvedValue({ content: ['array', 'content'] });
      const provider = createOllamaProvider();

      const result = await provider.chat([{ role: 'user', content: 'Hello' }]);
      expect(result.content).toBe('');
    });

    it('should throw ProviderUnavailableError on ECONNREFUSED', async () => {
      mockInvoke.mockRejectedValue(new Error('ECONNREFUSED'));
      const provider = createOllamaProvider();

      await expect(provider.chat([{ role: 'user', content: 'Hello' }])).rejects.toThrow(
        ProviderUnavailableError,
      );
    });

    it('should throw ProviderUnavailableError on fetch failed', async () => {
      mockInvoke.mockRejectedValue(new Error('fetch failed'));
      const provider = createOllamaProvider();

      await expect(provider.chat([{ role: 'user', content: 'Hello' }])).rejects.toThrow(
        ProviderUnavailableError,
      );
    });

    it('should rethrow non-connection errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Some other error'));
      const provider = createOllamaProvider();

      await expect(provider.chat([{ role: 'user', content: 'Hello' }])).rejects.toThrow(
        'Some other error',
      );
    });

    it('should rethrow non-Error objects', async () => {
      mockInvoke.mockRejectedValue('string error');
      const provider = createOllamaProvider();

      await expect(provider.chat([{ role: 'user', content: 'Hello' }])).rejects.toBe(
        'string error',
      );
    });
  });

  describe('stream', () => {
    it('should yield chunks and final done chunk', async () => {
      const asyncIterator = (async function* () {
        yield { content: 'Hello' };
        yield { content: ' world' };
      })();
      mockStream.mockResolvedValue(asyncIterator);

      const provider = createOllamaProvider();
      const chunks: Array<{ content: string; done: boolean }> = [];

      for await (const chunk of provider.stream([{ role: 'user', content: 'Hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ content: 'Hello', done: false });
      expect(chunks[1]).toEqual({ content: ' world', done: false });
      expect(chunks[2]).toEqual({ content: '', done: true });
    });

    it('should handle non-string chunk content', async () => {
      const asyncIterator = (async function* () {
        yield { content: ['array'] };
      })();
      mockStream.mockResolvedValue(asyncIterator);

      const provider = createOllamaProvider();
      const chunks: Array<{ content: string; done: boolean }> = [];

      for await (const chunk of provider.stream([{ role: 'user', content: 'Hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toEqual({ content: '', done: false });
    });

    it('should throw ProviderUnavailableError on ECONNREFUSED', async () => {
      mockStream.mockRejectedValue(new Error('ECONNREFUSED'));
      const provider = createOllamaProvider();

      await expect(async () => {
        for await (const _chunk of provider.stream([{ role: 'user', content: 'Hi' }])) {
          // consume
        }
      }).rejects.toThrow(ProviderUnavailableError);
    });

    it('should throw StreamError on other errors', async () => {
      const asyncIterator = (async function* () {
        yield { content: 'partial' };
        throw new Error('Network timeout');
      })();
      mockStream.mockResolvedValue(asyncIterator);

      const provider = createOllamaProvider();

      await expect(async () => {
        for await (const _chunk of provider.stream([{ role: 'user', content: 'Hi' }])) {
          // consume
        }
      }).rejects.toThrow(StreamError);
    });

    it('should rethrow non-Error objects in stream', async () => {
      mockStream.mockRejectedValue('string error');

      const provider = createOllamaProvider();

      await expect(async () => {
        for await (const _chunk of provider.stream([{ role: 'user', content: 'Hi' }])) {
          // consume
        }
      }).rejects.toBe('string error');
    });
  });

  describe('healthCheck', () => {
    it('should return true when server responds ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
      const provider = createOllamaProvider();

      expect(await provider.healthCheck()).toBe(true);
    });

    it('should return false when server responds not ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const provider = createOllamaProvider();

      expect(await provider.healthCheck()).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const provider = createOllamaProvider();

      expect(await provider.healthCheck()).toBe(false);
    });
  });
});

describe('OllamaProvider (legacy class)', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockStream.mockReset();
  });

  it('should delegate to createOllamaProvider', () => {
    const provider = new OllamaProvider({ model: 'test-model' });
    expect(provider.getProviderName()).toBe('ollama');
    expect(provider.getModelName()).toBe('test-model');
  });
});
