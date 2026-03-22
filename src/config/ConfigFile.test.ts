import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfigFilePath, loadConfigFile, saveConfigFile } from './ConfigFile.js';

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
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ provider: 'ollama' }));
      const result = loadConfigFile();
      expect(result.provider).toBe('ollama');
    });

    it('should parse valid config file with baseUrl', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ baseUrl: 'http://localhost:8080' }),
      );
      const result = loadConfigFile();
      expect(result.baseUrl).toBe('http://localhost:8080');
    });

    it('should parse valid config file with wordgrainFile', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ wordgrainFile: '/path/to/a.wg.json' }),
      );
      const result = loadConfigFile();
      expect(result.wordgrainFile).toBe('/path/to/a.wg.json');
    });

    it('should migrate old wordgrainFiles array to single wordgrainFile', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ wordgrainFiles: ['/path/to/a.wg.json', '/path/to/b.wg.json'] }),
      );
      const result = loadConfigFile();
      expect(result.wordgrainFile).toBe('/path/to/a.wg.json');
    });

    it('should prefer new wordgrainFile over old wordgrainFiles', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          wordgrainFile: '/path/to/new.wg.json',
          wordgrainFiles: ['/path/to/old.wg.json'],
        }),
      );
      const result = loadConfigFile();
      expect(result.wordgrainFile).toBe('/path/to/new.wg.json');
    });

    it('should ignore non-string wordgrainFile values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ wordgrainFile: 123 }));
      const result = loadConfigFile();
      expect(result.wordgrainFile).toBeUndefined();
    });

    it('should migrate old array format filtering non-string entries', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ wordgrainFiles: ['/valid.wg.json', 123, null] }),
      );
      const result = loadConfigFile();
      expect(result.wordgrainFile).toBe('/valid.wg.json');
    });

    it('should not set wordgrainFile for empty array after filtering', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ wordgrainFiles: [123, null] }));
      const result = loadConfigFile();
      expect(result.wordgrainFile).toBeUndefined();
    });

    it('should parse valid config file with all fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          model: 'qwen2.5-coder:7b',
          provider: 'ollama',
          baseUrl: 'http://localhost:8080',
          wordgrainFile: '/path/to/vocab.wg.json',
        }),
      );
      const result = loadConfigFile();
      expect(result.model).toBe('qwen2.5-coder:7b');
      expect(result.provider).toBe('ollama');
      expect(result.baseUrl).toBe('http://localhost:8080');
      expect(result.wordgrainFile).toBe('/path/to/vocab.wg.json');
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

    it('should parse valid features object', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ features: { barQuote: true } }));
      const result = loadConfigFile();
      expect(result.features).toEqual({ barQuote: true });
    });

    it('should ignore non-object features values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ features: 'not-object' }));
      const result = loadConfigFile();
      expect(result.features).toBeUndefined();
    });

    it('should ignore non-boolean feature flag values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ features: { barQuote: 'yes' } }));
      const result = loadConfigFile();
      expect(result.features).toBeUndefined();
    });

    it('should ignore null features value', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ features: null }));
      const result = loadConfigFile();
      expect(result.features).toBeUndefined();
    });
  });

  describe('saveConfigFile', () => {
    it('should create config directory and write file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFile: '/path/to/file.wg.json' });

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join('/home/user', '.config', 'mumbl'), {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.wordgrainFile).toBe('/path/to/file.wg.json');
    });

    it('should merge with existing config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ model: 'llama2', provider: 'ollama' }),
      );
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFile: '/path/to/file.wg.json' });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.model).toBe('llama2');
      expect(written.provider).toBe('ollama');
      expect(written.wordgrainFile).toBe('/path/to/file.wg.json');
    });

    it('should clean up old wordgrainFiles key when saving wordgrainFile', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ wordgrainFiles: ['/old.wg.json'] }),
      );
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFile: '/new.wg.json' });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.wordgrainFile).toBe('/new.wg.json');
      expect(written.wordgrainFiles).toBeUndefined();
    });

    it('should handle malformed existing config gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ wordgrainFile: '' });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.wordgrainFile).toBe('');
    });

    it('should save features to config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ features: { barQuote: true } });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.features).toEqual({ barQuote: true });
    });

    it('should deep merge features with existing features', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ features: { barQuote: false } }));
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ features: { barQuote: true } });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.features).toEqual({ barQuote: true });
    });

    it('should preserve existing features when saving other fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ features: { barQuote: true }, model: 'llama2' }),
      );
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveConfigFile({ model: 'gpt-4' });

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse((writeCall?.[1] as string).trim());
      expect(written.features).toEqual({ barQuote: true });
      expect(written.model).toBe('gpt-4');
    });
  });
});
