import { describe, expect, it } from 'vitest';
import { parseCliArgs } from './cli-args.js';

describe('parseCliArgs', () => {
  describe('--model flag', () => {
    it('should parse --model flag with space separator', () => {
      const result = parseCliArgs(['--model', 'gpt-4']);
      expect(result.model).toBe('gpt-4');
    });

    it('should parse --model=value format', () => {
      const result = parseCliArgs(['--model=gpt-4']);
      expect(result.model).toBe('gpt-4');
    });

    it('should not parse --model when followed by another flag', () => {
      const result = parseCliArgs(['--model', '--provider', 'ollama']);
      expect(result.model).toBeUndefined();
      expect(result.provider).toBe('ollama');
    });

    it('should handle empty --model= value', () => {
      const result = parseCliArgs(['--model=']);
      expect(result.model).toBeUndefined();
    });
  });

  describe('--provider flag', () => {
    it('should parse --provider flag with space separator', () => {
      const result = parseCliArgs(['--provider', 'anthropic']);
      expect(result.provider).toBe('anthropic');
    });

    it('should parse --provider=value format', () => {
      const result = parseCliArgs(['--provider=ollama']);
      expect(result.provider).toBe('ollama');
    });

    it('should ignore invalid provider values with space separator', () => {
      const result = parseCliArgs(['--provider', 'invalid']);
      expect(result.provider).toBeUndefined();
    });

    it('should ignore invalid provider values with = format', () => {
      const result = parseCliArgs(['--provider=invalid']);
      expect(result.provider).toBeUndefined();
    });

    it('should accept ollama as provider', () => {
      const result = parseCliArgs(['--provider', 'ollama']);
      expect(result.provider).toBe('ollama');
    });

    it('should accept anthropic as provider', () => {
      const result = parseCliArgs(['--provider', 'anthropic']);
      expect(result.provider).toBe('anthropic');
    });
  });

  describe('combined flags', () => {
    it('should parse both --model and --provider', () => {
      const result = parseCliArgs(['--model', 'gpt-4', '--provider', 'anthropic']);
      expect(result.model).toBe('gpt-4');
      expect(result.provider).toBe('anthropic');
    });

    it('should parse flags in any order', () => {
      const result = parseCliArgs(['--provider', 'ollama', '--model', 'llama2']);
      expect(result.model).toBe('llama2');
      expect(result.provider).toBe('ollama');
    });

    it('should handle mixed = and space formats', () => {
      const result = parseCliArgs(['--model=gpt-4', '--provider', 'anthropic']);
      expect(result.model).toBe('gpt-4');
      expect(result.provider).toBe('anthropic');
    });
  });

  describe('edge cases', () => {
    it('should return empty object for no args', () => {
      const result = parseCliArgs([]);
      expect(result).toEqual({});
    });

    it('should ignore unknown flags', () => {
      const result = parseCliArgs(['--unknown', 'value', '--foo=bar']);
      expect(result).toEqual({});
    });

    it('should handle model with special characters', () => {
      const result = parseCliArgs(['--model', 'qwen2.5-coder:7b']);
      expect(result.model).toBe('qwen2.5-coder:7b');
    });
  });
});
