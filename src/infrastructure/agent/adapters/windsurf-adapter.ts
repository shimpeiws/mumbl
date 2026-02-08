import { AgentType } from '../types.js';
import type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';

/**
 * Create adapter for Windsurf editor agent (Codeium)
 */
export function createWindsurfAdapter(): AgentAdapter {
  const agentType = AgentType.Windsurf;

  const healthCheck = async (): Promise<boolean> => {
    return (
      process.env['WINDSURF_SESSION_ID'] !== undefined ||
      process.env['WINDSURF_EDITOR'] !== undefined ||
      process.env['CODEIUM_WINDSURF'] !== undefined ||
      process.env['TERM_PROGRAM'] === 'Windsurf'
    );
  };

  const getState = async (): Promise<AgentState> => {
    const sessionId = process.env['WINDSURF_SESSION_ID'];

    return {
      isActive: await healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        editor: process.env['WINDSURF_EDITOR'],
        codeium: process.env['CODEIUM_WINDSURF'],
        termProgram: process.env['TERM_PROGRAM'],
      },
    };
  };

  const sendContext = async (context: AgentContext): Promise<SendContextResult> => {
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Windsurf adapter`,
    };
  };

  const getCapabilities = (): AgentCapabilities => ({
    canReceiveContext: true,
    canAccessFiles: true,
    canAccessTerminal: true,
    supportsStreaming: true,
    custom: {
      hasCascade: true,
      hasCodeium: true,
    },
  });

  const getDisplayName = (): string => 'Windsurf';

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
 * @deprecated Use createWindsurfAdapter() instead
 */
export class WindsurfAdapter implements AgentAdapter {
  readonly agentType = AgentType.Windsurf;
  private readonly _adapter = createWindsurfAdapter();

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
