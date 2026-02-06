import {
  ClaudeCodeDetector,
  CursorDetector,
  GeminiCLIDetector,
  WindsurfDetector,
} from './detectors/index.js';
import { type AgentDetectionResult, type AgentDetector, AgentType } from './types.js';

/**
 * Main agent detector that checks all available detectors
 * and returns the first match or unknown as fallback
 */
export class AgentDetectorService {
  private readonly detectors: AgentDetector[];

  constructor(detectors?: AgentDetector[]) {
    this.detectors = detectors ?? [
      new ClaudeCodeDetector(),
      new CursorDetector(),
      new WindsurfDetector(),
      new GeminiCLIDetector(),
    ];
  }

  /**
   * Detect the currently active AI coding agent
   * Checks each detector in order and returns the first match
   * Falls back to Unknown if no agent is detected
   */
  async detect(): Promise<AgentDetectionResult> {
    for (const detector of this.detectors) {
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
  }

  /**
   * Get all registered detector agent types
   */
  getRegisteredAgents(): AgentType[] {
    return this.detectors.map((d) => d.agentType);
  }
}

/**
 * Singleton instance for convenience
 */
let detectorInstance: AgentDetectorService | null = null;

/**
 * Get the singleton agent detector instance
 */
export function getAgentDetector(): AgentDetectorService {
  if (!detectorInstance) {
    detectorInstance = new AgentDetectorService();
  }
  return detectorInstance;
}

/**
 * Detect the currently active agent (convenience function)
 */
export async function detectAgent(): Promise<AgentDetectionResult> {
  return getAgentDetector().detect();
}
