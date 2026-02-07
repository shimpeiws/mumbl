import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Adapter for Cursor editor agent
 */
export class CursorAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.Cursor;

  async getState(): Promise<AgentState> {
    const sessionId = this.getEnvVar('CURSOR_SESSION_ID');
    const traceId = this.getEnvVar('CURSOR_TRACE_ID');

    return {
      isActive: await this.healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        traceId,
        editor: this.getEnvVar('CURSOR_EDITOR'),
        termProgram: this.getEnvVar('TERM_PROGRAM'),
      },
    };
  }

  async sendContext(context: AgentContext): Promise<SendContextResult> {
    // Cursor uses IDE integration for context
    // Context is primarily managed through the editor
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Cursor adapter`,
    };
  }

  getCapabilities(): AgentCapabilities {
    return {
      canReceiveContext: true,
      canAccessFiles: true,
      canAccessTerminal: true,
      supportsStreaming: true,
      custom: {
        hasComposer: true,
        hasInlineEdit: true,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return (
      this.hasEnvVar('CURSOR_SESSION_ID') ||
      this.hasEnvVar('CURSOR_EDITOR') ||
      this.hasEnvVar('CURSOR_TRACE_ID') ||
      this.getEnvVar('TERM_PROGRAM') === 'Cursor'
    );
  }

  getDisplayName(): string {
    return 'Cursor';
  }
}
