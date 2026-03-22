/**
 * Config file loading and saving for mumbl
 *
 * Loads/saves configuration from/to ~/.config/mumbl/config.json
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { MumblConfig, MumblFeatures } from './types.js';

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

    if (config['provider'] === 'ollama') {
      result.provider = config['provider'];
    }

    if (typeof config['baseUrl'] === 'string') {
      result.baseUrl = config['baseUrl'];
    }

    // Support new single-file format and migrate old array format
    if (typeof config['wordgrainFile'] === 'string') {
      result.wordgrainFile = config['wordgrainFile'];
    } else if (Array.isArray(config['wordgrainFiles'])) {
      const files = config['wordgrainFiles'].filter((f: unknown) => typeof f === 'string');
      if (files.length > 0) {
        result.wordgrainFile = files[0];
      }
    }

    if (typeof config['features'] === 'object' && config['features'] !== null) {
      const rawFeatures = config['features'] as Record<string, unknown>;
      const features: MumblFeatures = {};
      if (typeof rawFeatures['barQuote'] === 'boolean') {
        features.barQuote = rawFeatures['barQuote'];
      }
      if (Object.keys(features).length > 0) {
        result.features = features;
      }
    }

    return result;
  } catch {
    // Silently ignore config file errors (missing, malformed JSON)
    return {};
  }
}

/**
 * Save configuration to config file
 * Merges the provided partial config with the existing file contents
 */
export function saveConfigFile(update: Partial<MumblConfig>): void {
  const configPath = getConfigFilePath();
  const configDir = path.dirname(configPath);

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Load existing raw config to preserve unknown fields
  let existing: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        existing = parsed as Record<string, unknown>;
      }
    }
  } catch {
    // Start fresh if existing file is malformed
  }

  // Merge update into existing config
  if (update.model !== undefined) existing['model'] = update.model;
  if (update.provider !== undefined) existing['provider'] = update.provider;
  if (update.baseUrl !== undefined) existing['baseUrl'] = update.baseUrl;
  if (update.wordgrainFile !== undefined) {
    existing['wordgrainFile'] = update.wordgrainFile;
    // Clean up old array format
    delete existing['wordgrainFiles'];
  }
  if (update.features !== undefined) {
    const existingFeatures =
      typeof existing['features'] === 'object' && existing['features'] !== null
        ? (existing['features'] as Record<string, unknown>)
        : {};
    existing['features'] = { ...existingFeatures, ...update.features };
  }

  fs.writeFileSync(configPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
}
