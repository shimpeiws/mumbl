/**
 * Configuration resolution with priority: CLI > Environment > Config file > Default
 */
import { DEFAULT_OLLAMA_MODEL } from '../services/llm/types.js';
import { parseCliArgs } from './CliArgs.js';
import { loadConfigFile } from './ConfigFile.js';
import { loadEnvVars } from './EnvVars.js';
import type { ConfigSource, MumblFeatures, ResolvedConfig } from './types.js';

export const DEFAULT_FEATURES: MumblFeatures = { barQuote: false };

/**
 * Resolve configuration from all sources with priority
 * Priority: CLI > Environment > Config file > Default
 *
 * @param cliArgs - Optional CLI arguments (defaults to process.argv)
 * @returns Fully resolved configuration
 */
export function resolveConfig(cliArgs?: string[]): ResolvedConfig {
  // Load from all sources
  const sources: ConfigSource = {
    cli: parseCliArgs(cliArgs),
    env: loadEnvVars(),
    file: loadConfigFile(),
  };

  // Merge with priority: CLI > Env > File > Default
  const model =
    sources.cli.model ?? sources.env.model ?? sources.file.model ?? DEFAULT_OLLAMA_MODEL;

  const baseUrl = sources.cli.baseUrl ?? sources.env.baseUrl ?? sources.file.baseUrl;

  const wordgrainFile = sources.file.wordgrainFile;

  const features: MumblFeatures = { ...DEFAULT_FEATURES, ...sources.file.features };

  return {
    provider: 'ollama',
    model,
    baseUrl,
    wordgrainFile,
    features,
  };
}
