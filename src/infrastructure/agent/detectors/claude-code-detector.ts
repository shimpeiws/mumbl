import { type AgentDetectionResult, type AgentDetector, AgentType } from '../types.js';

/**
 * Environment variables that indicate Claude Code is running
 */
const CLAUDE_CODE_ENV_VARS = [
  'CLAUDE_CODE',
  'CLAUDE_CODE_VERSION',
  'CLAUDE_CODE_SESSION_ID',
] as const;

/**
 * Detector for Claude Code CLI
 */
export class ClaudeCodeDetector implements AgentDetector {
  readonly agentType = AgentType.ClaudeCode;

  async detect(): Promise<AgentDetectionResult | null> {
    // Check environment variables
    for (const envVar of CLAUDE_CODE_ENV_VARS) {
      const value = process.env[envVar];
      if (value !== undefined && value !== '') {
        return {
          agent: AgentType.ClaudeCode,
          detectionMethod: 'env',
          metadata: {
            envVar,
            value,
          },
        };
      }
    }

    return null;
  }
}
