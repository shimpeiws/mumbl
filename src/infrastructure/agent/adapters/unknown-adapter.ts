import { AgentType } from '../types.js';
import type { AgentAdapter, AgentCapabilities, AgentContext, AgentState, SendContextResult } from './types.js';

/**
 * Fallback adapter for unknown or undetected agents
 * Provides no-op implementations with minimal capabilities
 */
export const unknownAdapter: AgentAdapter = {
  agentType: AgentType.Unknown,

  getState: async (): Promise<AgentState> => ({
    isActive: true,
    workingDirectory: process.cwd(),
  }),

  sendContext: async (_context: AgentContext): Promise<SendContextResult> => ({
    success: false,
    error: 'Unknown agent type - context sending not supported',
  }),

  getCapabilities: (): AgentCapabilities => ({
    canReceiveContext: false,
    canAccessFiles: false,
    canAccessTerminal: false,
    supportsStreaming: false,
  }),

  healthCheck: async (): Promise<boolean> => true,

  getDisplayName: (): string => 'Unknown Agent',
};
