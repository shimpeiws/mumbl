import { type AgentDetectionResult, type AgentDetector, AgentType } from '../types.js';

/**
 * Environment variables that indicate Gemini CLI is running
 */
const GEMINI_CLI_ENV_VARS = ['GEMINI_CLI', 'GEMINI_CLI_SESSION_ID', 'GOOGLE_GEMINI_CLI'] as const;

/**
 * Detector for Gemini CLI
 */
export const geminiCLIDetector: AgentDetector = {
  agentType: AgentType.GeminiCLI,

  detect: async (): Promise<AgentDetectionResult | null> => {
    // Check environment variables
    for (const envVar of GEMINI_CLI_ENV_VARS) {
      const value = process.env[envVar];
      if (value !== undefined && value !== '') {
        return {
          agent: AgentType.GeminiCLI,
          detectionMethod: 'env',
          metadata: {
            envVar,
            value,
          },
        };
      }
    }

    return null;
  },
};
