import { type AgentDetectionResult, type AgentDetector, AgentType } from '../types.js';

/**
 * Environment variables that indicate Windsurf is running
 */
const WINDSURF_ENV_VARS = ['WINDSURF_SESSION_ID', 'WINDSURF_EDITOR', 'CODEIUM_WINDSURF'] as const;

/**
 * Detector for Windsurf editor (Codeium)
 */
export const windsurfDetector: AgentDetector = {
  agentType: AgentType.Windsurf,

  detect: async (): Promise<AgentDetectionResult | null> => {
    // Check environment variables
    for (const envVar of WINDSURF_ENV_VARS) {
      const value = process.env[envVar];
      if (value !== undefined && value !== '') {
        return {
          agent: AgentType.Windsurf,
          detectionMethod: 'env',
          metadata: {
            envVar,
            value,
          },
        };
      }
    }

    // Check TERM_PROGRAM for Windsurf
    if (process.env['TERM_PROGRAM'] === 'Windsurf') {
      return {
        agent: AgentType.Windsurf,
        detectionMethod: 'env',
        metadata: {
          envVar: 'TERM_PROGRAM',
          value: 'Windsurf',
        },
      };
    }

    return null;
  },
};
