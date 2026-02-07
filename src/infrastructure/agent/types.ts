/**
 * Supported AI coding agents
 */
export enum AgentType {
  ClaudeCode = 'claude-code',
  Cursor = 'cursor',
  Windsurf = 'windsurf',
  GeminiCLI = 'gemini-cli',
  Unknown = 'unknown',
}

/**
 * Result of agent detection
 */
export interface AgentDetectionResult {
  /** Detected agent type */
  agent: AgentType;
  /** Detection method used */
  detectionMethod: 'env' | 'process' | 'fallback';
  /** Additional metadata about detection */
  metadata?: Record<string, string>;
}

/**
 * Agent detector interface
 */
export interface AgentDetector {
  /** Agent type this detector handles */
  readonly agentType: AgentType;
  /** Check if this agent is active */
  detect(): Promise<AgentDetectionResult | null>;
}
