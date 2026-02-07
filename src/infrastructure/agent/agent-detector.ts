import {
  claudeCodeDetector,
  cursorDetector,
  geminiCLIDetector,
  windsurfDetector,
} from './detectors/index.js';
import { type AgentDetectionResult, type AgentDetector, AgentType } from './types.js';

/**
 * Default detectors in priority order
 */
const defaultDetectors: AgentDetector[] = [
  claudeCodeDetector,
  cursorDetector,
  windsurfDetector,
  geminiCLIDetector,
];

/**
 * Create an agent detector service
 */
export const createAgentDetectorService = (detectors: AgentDetector[] = defaultDetectors) => ({
  /**
   * Detect the currently active AI coding agent
   * Checks each detector in order and returns the first match
   * Falls back to Unknown if no agent is detected
   */
  detect: async (): Promise<AgentDetectionResult> => {
    for (const detector of detectors) {
      const result = await detector.detect();
      if (result !== null) {
        return result;
      }
    }

    // Unknown agent fallback
    return {
      agent: AgentType.Unknown,
      detectionMethod: 'fallback',
    };
  },

  /**
   * Get all registered detector agent types
   */
  getRegisteredAgents: (): AgentType[] => {
    return detectors.map((d) => d.agentType);
  },
});

export type AgentDetectorService = ReturnType<typeof createAgentDetectorService>;

/**
 * Singleton instance for convenience
 */
let detectorInstance: AgentDetectorService | null = null;

/**
 * Get the singleton agent detector instance
 */
export function getAgentDetector(): AgentDetectorService {
  if (!detectorInstance) {
    detectorInstance = createAgentDetectorService();
  }
  return detectorInstance;
}

/**
 * Detect the currently active agent (convenience function)
 */
export async function detectAgent(): Promise<AgentDetectionResult> {
  return getAgentDetector().detect();
}
