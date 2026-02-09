import { createClaudeCodeProcessingDetector } from '../detectors/claude-code-processing-detector.js';
import type { ProcessingDetector, ProcessingStateCallback } from '../processing-detector.js';
import { AgentType } from '../types.js';
import type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';

/**
 * Extended adapter interface with processing detector support
 */
export interface ClaudeCodeAgentAdapter extends AgentAdapter {
  getProcessingDetector(): ProcessingDetector;
  startProcessingMonitor(): void;
  stopProcessingMonitor(): void;
  onProcessingStateChange(callback: ProcessingStateCallback): () => void;
}

/**
 * Create adapter for Claude Code CLI agent
 */
export function createClaudeCodeAdapter(
  pollingIntervalMs?: number,
): ClaudeCodeAgentAdapter {
  const agentType = AgentType.ClaudeCode;
  const processingDetector = createClaudeCodeProcessingDetector(pollingIntervalMs);

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
    const isProcessing = await processingDetector.isProcessing();

    return {
      isActive: await healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      isProcessing,
      processingStartTime: processingDetector.getProcessingStartTime(),
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

  const getProcessingDetector = (): ProcessingDetector => processingDetector;

  const startProcessingMonitor = (): void => {
    processingDetector.startMonitoring();
  };

  const stopProcessingMonitor = (): void => {
    processingDetector.stopMonitoring();
  };

  const onProcessingStateChange = (callback: ProcessingStateCallback): (() => void) => {
    return processingDetector.onStateChange(callback);
  };

  return {
    agentType,
    getState,
    sendContext,
    getCapabilities,
    healthCheck,
    getDisplayName,
    getProcessingDetector,
    startProcessingMonitor,
    stopProcessingMonitor,
    onProcessingStateChange,
  };
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use createClaudeCodeAdapter() instead
 */
export class ClaudeCodeAdapter implements ClaudeCodeAgentAdapter {
  readonly agentType = AgentType.ClaudeCode;
  private readonly _adapter: ClaudeCodeAgentAdapter;

  constructor(pollingIntervalMs?: number) {
    this._adapter = createClaudeCodeAdapter(pollingIntervalMs);
  }

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
  getProcessingDetector() {
    return this._adapter.getProcessingDetector();
  }
  startProcessingMonitor() {
    return this._adapter.startProcessingMonitor();
  }
  stopProcessingMonitor() {
    return this._adapter.stopProcessingMonitor();
  }
  onProcessingStateChange(callback: ProcessingStateCallback) {
    return this._adapter.onProcessingStateChange(callback);
  }
}
