import { AgentType } from '../types.js';
import type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';

/**
 * Create adapter for Cursor editor agent
 */
export function createCursorAdapter(): AgentAdapter {
  const agentType = AgentType.Cursor;

  const healthCheck = async (): Promise<boolean> => {
    return (
      process.env['CURSOR_SESSION_ID'] !== undefined ||
      process.env['CURSOR_EDITOR'] !== undefined ||
      process.env['CURSOR_TRACE_ID'] !== undefined ||
      process.env['TERM_PROGRAM'] === 'Cursor'
    );
  };

  const getState = async (): Promise<AgentState> => {
    const sessionId = process.env['CURSOR_SESSION_ID'];
    const traceId = process.env['CURSOR_TRACE_ID'];

    return {
      isActive: await healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      metadata: {
        traceId,
        editor: process.env['CURSOR_EDITOR'],
        termProgram: process.env['TERM_PROGRAM'],
      },
    };
  };

  const sendContext = async (context: AgentContext): Promise<SendContextResult> => {
    return {
      success: true,
      response: `Context type '${context.type}' acknowledged by Cursor adapter`,
    };
  };

  const getCapabilities = (): AgentCapabilities => ({
    canReceiveContext: true,
    canAccessFiles: true,
    canAccessTerminal: true,
    supportsStreaming: true,
    custom: {
      hasComposer: true,
      hasInlineEdit: true,
    },
  });

  const getDisplayName = (): string => 'Cursor';

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
 * @deprecated Use createCursorAdapter() instead
 */
export class CursorAdapter implements AgentAdapter {
  readonly agentType = AgentType.Cursor;
  private readonly _adapter = createCursorAdapter();

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
