/**
 * Configuration resolution with priority: CLI > Environment > Config file > Default
 */
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OLLAMA_MODEL } from '../services/llm/types.js';
import { parseCliArgs } from './cli-args.js';
import { loadConfigFile } from './config-file.js';
import { getApiKey, loadEnvVars } from './env-vars.js';
import type { ConfigSource, ResolvedConfig } from './types.js';

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
  const provider =
    sources.cli.provider ?? sources.env.provider ?? sources.file.provider ?? 'ollama';

  const defaultModel = provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_ANTHROPIC_MODEL;

  const model = sources.cli.model ?? sources.env.model ?? sources.file.model ?? defaultModel;

  const baseUrl = sources.cli.baseUrl ?? sources.env.baseUrl ?? sources.file.baseUrl;

  return {
    provider,
    model,
    baseUrl,
    apiKey: getApiKey(),
  };
}
