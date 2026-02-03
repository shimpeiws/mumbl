import * as fs from 'node:fs';
import * as os from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfigFilePath, loadConfigFile } from './config-file.js';

vi.mock('node:fs');
vi.mock('node:os');

describe('config-file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/home/user');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getConfigFilePath', () => {
    it('should return correct config file path', () => {
      const path = getConfigFilePath();
      expect(path).toBe('/home/user/.config/mumbl/config.json');
    });
  });

  describe('loadConfigFile', () => {
    it('should return empty object when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = loadConfigFile();
      expect(result).toEqual({});
    });

    it('should parse valid config file with model', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ model: 'gpt-4' }));
      const result = loadConfigFile();
      expect(result.model).toBe('gpt-4');
    });

    it('should parse valid config file with provider', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ provider: 'anthropic' }));
      const result = loadConfigFile();
      expect(result.provider).toBe('anthropic');
    });

    it('should parse valid config file with baseUrl', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ baseUrl: 'http://localhost:8080' }),
      );
      const result = loadConfigFile();
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should parse valid config file with all fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          model: 'gpt-4',
          provider: 'anthropic',
          baseUrl: 'http://localhost:8080',
        }),
      );
      const result = loadConfigFile();
      expect(result.model).toBe('gpt-4');
      expect(result.provider).toBe('anthropic');
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should return empty object for malformed JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
      const result = loadConfigFile();
      expect(result).toEqual({});
    });

    it('should return empty object for non-object JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('"string"');
      const result = loadConfigFile();
      expect(result).toEqual({});
    });

    it('should return empty object for null JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('null');
      const result = loadConfigFile();
      expect(result).toEqual({});
    });

    it('should ignore invalid provider values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ provider: 'invalid' }));
      const result = loadConfigFile();
      expect(result.provider).toBeUndefined();
    });

    it('should ignore non-string model values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ model: 123 }));
      const result = loadConfigFile();
      expect(result.model).toBeUndefined();
    });

    it('should ignore non-string baseUrl values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ baseUrl: 123 }));
      const result = loadConfigFile();
      expect(result.baseUrl).toBeUndefined();
    });

    it('should handle read errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const result = loadConfigFile();
      expect(result).toEqual({});
    });

    it('should accept ollama as provider', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ provider: 'ollama' }));
      const result = loadConfigFile();
      expect(result.provider).toBe('ollama');
    });
  });
});
