import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext, SendContextResult } from './types.js';

/**
 * Fallback adapter for unknown or undetected agents
 * Provides no-op implementations with minimal capabilities
 */
export class UnknownAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.Unknown;

  async sendContext(_context: AgentContext): Promise<SendContextResult> {
    // No-op for unknown agents
    return {
      success: false,
      error: 'Unknown agent type - context sending not supported',
    };
  }

  getCapabilities(): AgentCapabilities {
    return {
      canReceiveContext: false,
      canAccessFiles: false,
      canAccessTerminal: false,
      supportsStreaming: false,
    };
  }

  async healthCheck(): Promise<boolean> {
    // Unknown adapter is always "healthy" as a fallback
    return true;
  }

  getDisplayName(): string {
    return 'Unknown Agent';
  }
}
