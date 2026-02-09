import { BaseProcessingDetector } from '../processing-detector.js';

/**
 * Processing detector for Claude Code CLI
 *
 * Detects processing state by checking for environment variable indicators
 * that are set when Claude Code is actively processing a request.
 */
export class ClaudeCodeProcessingDetector extends BaseProcessingDetector {
  /**
   * Check if Claude Code is currently processing a request
   *
   * Detection strategy:
   * 1. Check CLAUDE_CODE_PROCESSING env var (if available)
   * 2. Check for active session indicator
   * 3. Fall back to checking if Claude Code is active but not idle
   */
  async isProcessing(): Promise<boolean> {
    // Check direct processing indicator
    if (this.hasEnvVar('CLAUDE_CODE_PROCESSING')) {
      return this.getEnvVar('CLAUDE_CODE_PROCESSING') === 'true';
    }

    // Check for thinking/processing indicator
    if (this.hasEnvVar('CLAUDE_CODE_THINKING')) {
      return this.getEnvVar('CLAUDE_CODE_THINKING') === 'true';
    }

    // Check for active tool use indicator
    if (this.hasEnvVar('CLAUDE_CODE_TOOL_USE')) {
      return this.getEnvVar('CLAUDE_CODE_TOOL_USE') === 'true';
    }

    // Default: not processing
    return false;
  }

  /**
   * Helper to get environment variable value
   */
  private getEnvVar(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * Helper to check if an environment variable exists
   */
  private hasEnvVar(name: string): boolean {
    return this.getEnvVar(name) !== undefined;
  }
}

/**
 * Create a new Claude Code processing detector instance
 */
export function createClaudeCodeProcessingDetector(
  pollingIntervalMs?: number,
): ClaudeCodeProcessingDetector {
  return new ClaudeCodeProcessingDetector(pollingIntervalMs);
}
