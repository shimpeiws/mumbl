import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Adapter for Claude Code CLI agent
 */
export class ClaudeCodeAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.ClaudeCode;

  async getState(): Promise<AgentState> {
    const sessionId = this.getEnvVar('CLAUDE_CODE_SESSION_ID');
    const version = this.getEnvVar('CLAUDE_CODE_VERSION');

    return {
      isActive: await this.healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        version: version ?? 'unknown',
        termProgram: this.getEnvVar('TERM_PROGRAM'),
      },
    };
  }

  async sendContext(context: AgentContext): Promise<SendContextResult> {
    // Claude Code operates within the CLI context
    // Context is available through the file system and environment
    // No direct communication protocol needed
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Claude Code adapter`,
    };
  }

  getCapabilities(): AgentCapabilities {
    return {
      canReceiveContext: true,
      canAccessFiles: true,
      canAccessTerminal: true,
      supportsStreaming: true,
      custom: {
        hasMCP: true,
        hasToolUse: true,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    // Check for Claude Code environment indicators
    return (
      this.hasEnvVar('CLAUDE_CODE') ||
      this.hasEnvVar('CLAUDE_CODE_VERSION') ||
      this.hasEnvVar('CLAUDE_CODE_SESSION_ID')
    );
  }

  getDisplayName(): string {
    return 'Claude Code';
  }
}
