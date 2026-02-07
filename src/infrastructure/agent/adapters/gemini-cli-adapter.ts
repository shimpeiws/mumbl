import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Adapter for Gemini CLI agent
 */
export class GeminiCLIAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.GeminiCLI;

  async getState(): Promise<AgentState> {
    const sessionId = this.getEnvVar('GEMINI_CLI_SESSION_ID');

    return {
      isActive: await this.healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        googleGemini: this.getEnvVar('GOOGLE_GEMINI_CLI'),
        termProgram: this.getEnvVar('TERM_PROGRAM'),
      },
    };
  }

  async sendContext(context: AgentContext): Promise<SendContextResult> {
    // Gemini CLI operates within the CLI context
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Gemini CLI adapter`,
    };
  }

  getCapabilities(): AgentCapabilities {
    return {
      canReceiveContext: true,
      canAccessFiles: true,
      canAccessTerminal: true,
      supportsStreaming: true,
      custom: {
        hasGoogleIntegration: true,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return (
      this.hasEnvVar('GEMINI_CLI') ||
      this.hasEnvVar('GEMINI_CLI_SESSION_ID') ||
      this.hasEnvVar('GOOGLE_GEMINI_CLI')
    );
  }

  getDisplayName(): string {
    return 'Gemini CLI';
  }
}
