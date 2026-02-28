import { describe, expect, it } from 'vitest';
import { parseCliArgs } from './cli-args.js';

describe('parseCliArgs', () => {
  describe('--model flag', () => {
    it('should parse --model flag with space separator', () => {
      const result = parseCliArgs(['--model', 'llama2']);
      expect(result.model).toBe('llama2');
    });

    it('should parse --model=value format', () => {
      const result = parseCliArgs(['--model=llama2']);
      expect(result.model).toBe('llama2');
    });

    it('should not parse --model when followed by another flag', () => {
      const result = parseCliArgs(['--model', '--other']);
      expect(result.model).toBeUndefined();
    });

    it('should handle empty --model= value', () => {
      const result = parseCliArgs(['--model=']);
      expect(result.model).toBeUndefined();
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
