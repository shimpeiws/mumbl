import { describe, expect, it, vi } from 'vitest';
import type { LLMServiceInterface } from '../llm/LLMService.js';
import { extractContextFromEntry, parseExtractionResponse } from './ContextExtractor.js';

describe('parseExtractionResponse', () => {
  it('should parse valid JSON array response', () => {
    const response = JSON.stringify([
      {
        contextType: 'preference',
        key: 'favorite_drink',
        value: { description: 'likes coffee' },
        confidence: 0.8,
      },
    ]);

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0]?.contextType).toBe('preference');
    expect(result[0]?.key).toBe('favorite_drink');
    expect(result[0]?.confidence).toBe(0.8);
  });

  it('should extract JSON from markdown code block', () => {
    const response = `Here is the result:
\`\`\`json
[{"contextType":"pattern","key":"work_late","value":{"description":"works late"},"confidence":0.6}]
\`\`\``;

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0]?.contextType).toBe('pattern');
  });

  it('should return empty array for empty JSON array', () => {
    const result = parseExtractionResponse('[]');
    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-JSON response', () => {
    const result = parseExtractionResponse('No context found.');
    expect(result).toHaveLength(0);
  });

  it('should return empty array for invalid JSON', () => {
    const result = parseExtractionResponse('[{invalid json}]');
    expect(result).toHaveLength(0);
  });

  it('should filter items with invalid contextType', () => {
    const response = JSON.stringify([
      {
        contextType: 'invalid_type',
        key: 'test',
        value: { description: 'test' },
        confidence: 0.5,
      },
      {
        contextType: 'profile',
        key: 'valid',
        value: { description: 'valid' },
        confidence: 0.7,
      },
    ]);

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0]?.contextType).toBe('profile');
  });

  it('should filter items with empty key', () => {
    const response = JSON.stringify([
      {
        contextType: 'preference',
        key: '',
        value: { description: 'test' },
        confidence: 0.5,
      },
    ]);

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(0);
  });

  it('should filter items with confidence out of range', () => {
    const response = JSON.stringify([
      {
        contextType: 'preference',
        key: 'low',
        value: { description: 'test' },
        confidence: 0.05,
      },
      {
        contextType: 'preference',
        key: 'high',
        value: { description: 'test' },
        confidence: 1.5,
      },
      {
        contextType: 'preference',
        key: 'valid',
        value: { description: 'test' },
        confidence: 0.5,
      },
    ]);

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('valid');
  });

  it('should filter items missing required fields', () => {
    const response = JSON.stringify([
      { contextType: 'preference', key: 'test' },
      { contextType: 'preference', value: {}, confidence: 0.5 },
      'not an object',
      null,
    ]);

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(0);
  });

  it('should wrap non-object values in description field', () => {
    const response = JSON.stringify([
      {
        contextType: 'preference',
        key: 'drink',
        value: 'coffee',
        confidence: 0.7,
      },
    ]);

    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0]?.value).toEqual({ description: 'coffee' });
  });

  it('should handle all valid context types', () => {
    const types = ['profile', 'preference', 'topic_affinity', 'pattern'];
    const items = types.map((t) => ({
      contextType: t,
      key: `key_${t}`,
      value: { description: 'test' },
      confidence: 0.5,
    }));

    const result = parseExtractionResponse(JSON.stringify(items));
    expect(result).toHaveLength(4);
  });

  it('should return empty array for non-array JSON', () => {
    const result = parseExtractionResponse('{"key": "value"}');
    expect(result).toHaveLength(0);
  });
});

describe('extractContextFromEntry', () => {
  const createMockLLMService = (response: string): LLMServiceInterface => {
    return {
      chat: vi.fn().mockResolvedValue({ content: response }),
      chatWithContext: vi.fn(),
      stream: vi.fn(),
      summarize: vi.fn(),
      reflect: vi.fn(),
      react: vi.fn(),
      healthCheck: vi.fn(),
      clearHistory: vi.fn(),
      getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
      setContextService: vi.fn(),
    };
  };

  it('should extract context from entry content', async () => {
    const mockResponse = JSON.stringify([
      {
        contextType: 'preference',
        key: 'favorite_drink',
        value: { description: 'likes coffee' },
        confidence: 0.8,
      },
    ]);

    const llmService = createMockLLMService(mockResponse);
    const result = await extractContextFromEntry('Had a great coffee today', llmService);

    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('favorite_drink');
    expect(llmService.chat).toHaveBeenCalledOnce();
  });

  it('should pass includeHistory false to LLM', async () => {
    const llmService = createMockLLMService('[]');
    await extractContextFromEntry('test', llmService);

    expect(llmService.chat).toHaveBeenCalledWith(expect.stringContaining('Extract user context'), {
      includeHistory: false,
    });
  });

  it('should return empty array on LLM error', async () => {
    const llmService = createMockLLMService('');
    (llmService.chat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

    const result = await extractContextFromEntry('test content', llmService);
    expect(result).toHaveLength(0);
  });
});
