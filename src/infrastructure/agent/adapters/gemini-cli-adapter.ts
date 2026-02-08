import { AgentType } from '../types.js';
import type { AgentAdapter, AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Create adapter for Gemini CLI agent
 */
export function createGeminiCLIAdapter(): AgentAdapter {
  const agentType = AgentType.GeminiCLI;

  const healthCheck = async (): Promise<boolean> => {
    return (
      process.env['GEMINI_CLI'] !== undefined ||
      process.env['GEMINI_CLI_SESSION_ID'] !== undefined ||
      process.env['GOOGLE_GEMINI_CLI'] !== undefined
    );
  };

  const getState = async (): Promise<AgentState> => {
    const sessionId = process.env['GEMINI_CLI_SESSION_ID'];

    return {
      isActive: await healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        googleGemini: process.env['GOOGLE_GEMINI_CLI'],
        termProgram: process.env['TERM_PROGRAM'],
      },
    };
  };

  const sendContext = async (context: AgentContext): Promise<SendContextResult> => {
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Gemini CLI adapter`,
    };
  };

  const getCapabilities = (): AgentCapabilities => ({
    canReceiveContext: true,
    canAccessFiles: true,
    canAccessTerminal: true,
    supportsStreaming: true,
    custom: {
      hasGoogleIntegration: true,
    },
  });

  const getDisplayName = (): string => 'Gemini CLI';

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
 * @deprecated Use createGeminiCLIAdapter() instead
 */
export class GeminiCLIAdapter implements AgentAdapter {
  readonly agentType = AgentType.GeminiCLI;
  private readonly _adapter = createGeminiCLIAdapter();

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
