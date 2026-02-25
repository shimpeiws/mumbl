import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfigFilePath, loadConfigFile, saveConfigFile } from './config-file.js';

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
      const configPath = getConfigFilePath();
      expect(configPath).toBe('/home/user/.config/mumbl/config.json');
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

    it('should parse valid config file with wordgrainFiles', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ wordgrainFiles: ['/path/to/a.wg.json', '/path/to/b.wg.json'] }),
      );
      const result = loadConfigFile();
      expect(result.wordgrainFiles).toEqual(['/path/to/a.wg.json', '/path/to/b.wg.json']);
    });

    it('should ignore non-array wordgrainFiles values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ wordgrainFiles: 'not-array' }));
      const result = loadConfigFile();
      expect(result.wordgrainFiles).toBeUndefined();
    });

    it('should filter non-string entries from wordgrainFiles', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ wordgrainFiles: ['/valid.wg.json', 123, null] }),
      );
      const result = loadConfigFile();
      expect(result.wordgrainFiles).toEqual(['/valid.wg.json']);
    });

    it('should not set wordgrainFiles for empty array after filtering', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ wordgrainFiles: [123, null] }));
      const result = loadConfigFile();
      expect(result.wordgrainFiles).toBeUndefined();
    });

    it('should parse valid config file with all fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          model: 'gpt-4',
          provider: 'anthropic',
          baseUrl: 'http://localhost:8080',
          wordgrainFiles: ['/path/to/vocab.wg.json'],
        }),
      );
      const result = loadConfigFile();
      expect(result.model).toBe('gpt-4');
      expect(result.provider).toBe('anthropic');
      expect(result.baseUrl).toBe('http://localhost:8080');
      expect(result.wordgrainFiles).toEqual(['/path/to/vocab.wg.json']);
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

  describe('saveConfigFile', () => {
    it('should create config directory and write file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFiles: ['/path/to/file.wg.json'] });

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join('/home/user', '.config', 'mumbl'), {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.wordgrainFiles).toEqual(['/path/to/file.wg.json']);
    });

    it('should merge with existing config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ model: 'gpt-4', provider: 'anthropic' }),
      );
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFiles: ['/path/to/file.wg.json'] });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.model).toBe('gpt-4');
      expect(written.provider).toBe('anthropic');
      expect(written.wordgrainFiles).toEqual(['/path/to/file.wg.json']);
    });

    it('should handle malformed existing config gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFiles: [] });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.wordgrainFiles).toEqual([]);
    });
  });
});
