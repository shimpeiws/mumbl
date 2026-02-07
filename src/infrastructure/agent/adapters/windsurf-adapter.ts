import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Adapter for Windsurf editor agent (Codeium)
 */
export class WindsurfAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.Windsurf;

  async getState(): Promise<AgentState> {
    const sessionId = this.getEnvVar('WINDSURF_SESSION_ID');

    return {
      isActive: await this.healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        editor: this.getEnvVar('WINDSURF_EDITOR'),
        codeium: this.getEnvVar('CODEIUM_WINDSURF'),
        termProgram: this.getEnvVar('TERM_PROGRAM'),
      },
    };
  }

  async sendContext(context: AgentContext): Promise<SendContextResult> {
    // Windsurf uses IDE integration for context
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Windsurf adapter`,
    };
  }

  getCapabilities(): AgentCapabilities {
    return {
      canReceiveContext: true,
      canAccessFiles: true,
      canAccessTerminal: true,
      supportsStreaming: true,
      custom: {
        hasCascade: true,
        hasCodeium: true,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return (
      this.hasEnvVar('WINDSURF_SESSION_ID') ||
      this.hasEnvVar('WINDSURF_EDITOR') ||
      this.hasEnvVar('CODEIUM_WINDSURF') ||
      this.getEnvVar('TERM_PROGRAM') === 'Windsurf'
    );
  }

  getDisplayName(): string {
    return 'Windsurf';
  }
}
