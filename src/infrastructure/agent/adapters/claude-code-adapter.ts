import { AgentType } from '../types.js';
import type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';

/**
 * Create adapter for Claude Code CLI agent
 */
export function createClaudeCodeAdapter(): AgentAdapter {
  const agentType = AgentType.ClaudeCode;

  const healthCheck = async (): Promise<boolean> => {
    return (
      process.env['CLAUDE_CODE'] !== undefined ||
      process.env['CLAUDE_CODE_VERSION'] !== undefined ||
      process.env['CLAUDE_CODE_SESSION_ID'] !== undefined
    );
  };

  const getState = async (): Promise<AgentState> => {
    const sessionId = process.env['CLAUDE_CODE_SESSION_ID'];
    const version = process.env['CLAUDE_CODE_VERSION'];

    return {
      isActive: await healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        version: version ?? 'unknown',
        termProgram: process.env['TERM_PROGRAM'],
      },
    };
  };

  const sendContext = async (context: AgentContext): Promise<SendContextResult> => {
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Claude Code adapter`,
    };
  };

  const getCapabilities = (): AgentCapabilities => ({
    canReceiveContext: true,
    canAccessFiles: true,
    canAccessTerminal: true,
    supportsStreaming: true,
    custom: {
      hasMCP: true,
      hasToolUse: true,
    },
  });

  const getDisplayName = (): string => 'Claude Code';

  return {
    agentType,
    getState,
    sendContext,
    getCapabilities,
    healthCheck,
    getDisplayName,
  };
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use createClaudeCodeAdapter() instead
 */
export class ClaudeCodeAdapter implements AgentAdapter {
  readonly agentType = AgentType.ClaudeCode;
  private readonly _adapter = createClaudeCodeAdapter();

  async getState() {
    return this._adapter.getState();
  }
  async sendContext(context: AgentContext) {
    return this._adapter.sendContext(context);
  }
  getCapabilities() {
    return this._adapter.getCapabilities();
  }
  async healthCheck() {
    return this._adapter.healthCheck();
  }
  getDisplayName() {
    return this._adapter.getDisplayName();
  }
}
