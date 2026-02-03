/**
 * Config file loading for mumbl
 *
 * Loads configuration from ~/.config/mumbl/config.json
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MumblConfig } from './types.js';

/**
 * Get the path to the config file
 * @returns Path to ~/.config/mumbl/config.json
 */
export function getConfigFilePath(): string {
  return path.join(os.homedir(), '.config', 'mumbl', 'config.json');
}

/**
 * Load configuration from config file
 * @returns Partial configuration from file, or empty object if file doesn't exist or is invalid
 */
export function loadConfigFile(): Partial<MumblConfig> {
  const configPath = getConfigFilePath();

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    // Validate the parsed config
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    const config = parsed as Record<string, unknown>;
    const result: Partial<MumblConfig> = {};

    if (typeof config['model'] === 'string') {
      result.model = config['model'];
    }

    if (config['provider'] === 'ollama' || config['provider'] === 'anthropic') {
      result.provider = config['provider'];
    }

    if (typeof config['baseUrl'] === 'string') {
      result.baseUrl = config['baseUrl'];
    }

    return result;
  } catch {
    // Silently ignore config file errors (missing, malformed JSON)
    return {};
  }
}
