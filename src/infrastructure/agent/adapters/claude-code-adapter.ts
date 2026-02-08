import {
  type ClaudeCodeProcessingDetector,
  createClaudeCodeProcessingDetector,
} from '../detectors/claude-code-processing-detector.js';
import type { ProcessingDetector, ProcessingStateCallback } from '../processing-detector.js';
import { AgentType } from '../types.js';
import { BaseAgentAdapter } from './base-adapter.js';
import type { AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Adapter for Claude Code CLI agent
 */
export class ClaudeCodeAdapter extends BaseAgentAdapter {
  readonly agentType = AgentType.ClaudeCode;
  private processingDetector: ClaudeCodeProcessingDetector;

  constructor(pollingIntervalMs?: number) {
    super();
    this.processingDetector = createClaudeCodeProcessingDetector(pollingIntervalMs);
  }

  async getState(): Promise<AgentState> {
    const sessionId = this.getEnvVar('CLAUDE_CODE_SESSION_ID');
    const version = this.getEnvVar('CLAUDE_CODE_VERSION');
    const isProcessing = await this.processingDetector.isProcessing();

    return {
      isActive: await this.healthCheck(),
      workingDirectory: process.cwd(),
      sessionId,
      isProcessing,
      processingStartTime: this.processingDetector.getProcessingStartTime(),
      metadata: {
        version: version ?? 'unknown',
        termProgram: this.getEnvVar('TERM_PROGRAM'),
      },
    };
  }

  /**
   * Get the processing detector for this adapter
   */
  getProcessingDetector(): ProcessingDetector {
    return this.processingDetector;
  }

  /**
   * Start monitoring for processing state changes
   */
  startProcessingMonitor(): void {
    this.processingDetector.startMonitoring();
  }

  /**
   * Stop monitoring for processing state changes
   */
  stopProcessingMonitor(): void {
    this.processingDetector.stopMonitoring();
  }

  /**
   * Subscribe to processing state changes
   */
  onProcessingStateChange(callback: ProcessingStateCallback): () => void {
    return this.processingDetector.onStateChange(callback);
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
