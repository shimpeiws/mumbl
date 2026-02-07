import type { AgentType } from '../types.js';
import type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';

/**
 * Abstract base class for agent adapters
 * Provides common functionality and default implementations
 */
export abstract class BaseAgentAdapter implements AgentAdapter {
  abstract readonly agentType: AgentType;

  /**
   * Get the current state of the agent
   * Subclasses should override to provide agent-specific state
   */
  async getState(): Promise<AgentState> {
    return {
      isActive: await this.healthCheck(),
      workingDirectory: process.cwd(),
    };
  }

  /**
   * Send context to the agent
   * Default implementation returns success with no-op
   * Subclasses should override for agent-specific communication
   */
  async sendContext(_context: AgentContext): Promise<SendContextResult> {
    return {
      success: true,
      response: 'Context received (no-op)',
    };
  }

  /**
   * Get the capabilities of this agent
   * Subclasses should override to provide accurate capabilities
   */
  abstract getCapabilities(): AgentCapabilities;

  /**
   * Check if the agent is available
   * Default implementation returns true
   * Subclasses should override for actual health checks
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Get a human-readable display name
   * Subclasses should override for custom names
   */
  abstract getDisplayName(): string;

  /**
   * Helper to get environment variable value
   */
  protected getEnvVar(name: string): string | undefined {
    return process.env[name];
  }

  /**
   * Helper to check if an environment variable exists
   */
  protected hasEnvVar(name: string): boolean {
    return this.getEnvVar(name) !== undefined;
  }
}
