import { type AgentDetectionResult, type AgentDetector, AgentType } from '../types.js';

/**
 * Environment variables that indicate Cursor editor is running
 */
const CURSOR_ENV_VARS = [
  'CURSOR_SESSION_ID',
  'CURSOR_EDITOR',
  'CURSOR_TRACE_ID',
] as const;

/**
 * Detector for Cursor editor
 */
export class CursorDetector implements AgentDetector {
  readonly agentType = AgentType.Cursor;

  async detect(): Promise<AgentDetectionResult | null> {
    // Check environment variables
    for (const envVar of CURSOR_ENV_VARS) {
      const value = process.env[envVar];
      if (value !== undefined && value !== '') {
        return {
          agent: AgentType.Cursor,
          detectionMethod: 'env',
          metadata: {
            envVar,
            value,
          },
        };
      }
    }

    // Check TERM_PROGRAM for Cursor
    if (process.env['TERM_PROGRAM'] === 'Cursor') {
      return {
        agent: AgentType.Cursor,
        detectionMethod: 'env',
        metadata: {
          envVar: 'TERM_PROGRAM',
          value: 'Cursor',
        },
      };
    }

    return null;
  }
}
