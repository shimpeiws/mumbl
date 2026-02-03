/**
 * CLI argument parsing for mumbl
 *
 * Supports:
 * - --model <model-name> or --model=<model-name>
 * - --provider <ollama|anthropic> or --provider=<ollama|anthropic>
 */
import type { MumblConfig } from './types.js';

/**
 * Parse CLI arguments into configuration
 * @param args - Command line arguments (defaults to process.argv.slice(2))
 * @returns Partial configuration from CLI args
 */
export function parseCliArgs(args: string[] = process.argv.slice(2)): Partial<MumblConfig> {
  const result: Partial<MumblConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;

    const nextArg = args[i + 1];

    if (arg === '--model' && nextArg !== undefined && !nextArg.startsWith('--')) {
      result.model = nextArg;
      i++;
    } else if (arg === '--provider' && nextArg !== undefined && !nextArg.startsWith('--')) {
      if (nextArg === 'ollama' || nextArg === 'anthropic') {
        result.provider = nextArg;
      }
      i++;
    } else if (arg.startsWith('--model=')) {
      const value = arg.slice('--model='.length);
      if (value) {
        result.model = value;
      }
    } else if (arg.startsWith('--provider=')) {
      const value = arg.slice('--provider='.length);
      if (value === 'ollama' || value === 'anthropic') {
        result.provider = value;
      }
    }
  }

  return result;
}
