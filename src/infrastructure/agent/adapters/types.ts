import type { AgentType } from '../types.js';

/**
 * Agent state information
 */
export interface AgentState {
  /** Whether the agent is currently active */
  isActive: boolean;
  /** Current working directory of the agent */
  workingDirectory?: string;
  /** Current session ID if available */
  sessionId?: string;
  /** Whether the agent is currently processing a request */
  isProcessing?: boolean;
  /** When processing started */
  processingStartTime?: Date;
  /** Additional agent-specific state */
  metadata?: Record<string, unknown>;
}

/**
 * Context that can be sent to the agent
 */
export interface AgentContext {
  /** Type of context being sent */
  type: 'file' | 'selection' | 'error' | 'output' | 'custom';
  /** Context content */
  content: string;
  /** Source file path if applicable */
  filePath?: string;
  /** Line range if applicable */
  lineRange?: { start: number; end: number };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of sending context to an agent
 */
export interface SendContextResult {
  /** Whether the context was successfully sent */
  success: boolean;
  /** Error message if sending failed */
  error?: string;
  /** Agent's acknowledgment or response if available */
  response?: string;
}

/**
 * Agent capabilities
 */
export interface AgentCapabilities {
  /** Whether the agent supports receiving context */
  canReceiveContext: boolean;
  /** Whether the agent supports file operations */
  canAccessFiles: boolean;
  /** Whether the agent supports terminal output */
  canAccessTerminal: boolean;
  /** Whether the agent supports streaming responses */
  supportsStreaming: boolean;
  /** Additional capabilities */
  custom?: Record<string, boolean>;
}

/**
 * Agent adapter interface for integrating with different AI coding agents
 */
export interface AgentAdapter {
  /** Agent type this adapter handles */
  readonly agentType: AgentType;

  /**
   * Get the current state of the agent
   */
  getState(): Promise<AgentState>;

  /**
   * Send context to the agent
   * @param context - Context to send
   */
  sendContext(context: AgentContext): Promise<SendContextResult>;

  /**
   * Get the capabilities of this agent
   */
  getCapabilities(): AgentCapabilities;

  /**
   * Check if the agent is available and responsive
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get a human-readable name for this agent
   */
  getDisplayName(): string;
}
