// Agent detection
export { AgentDetectorService, detectAgent, getAgentDetector } from './agent-detector.js';
export {
  ClaudeCodeDetector,
  CursorDetector,
  GeminiCLIDetector,
  WindsurfDetector,
} from './detectors/index.js';
export { logAgentDetection } from './logger.js';
export { type AgentDetectionResult, type AgentDetector, AgentType } from './types.js';

// Agent adapters
export {
  type AgentAdapter,
  type AgentCapabilities,
  type AgentContext,
  type AgentState,
  BaseAgentAdapter,
  ClaudeCodeAdapter,
  createAdapter,
  createAdapterFromDetection,
  CursorAdapter,
  GeminiCLIAdapter,
  getAdapter,
  getRegisteredAdapterTypes,
  registerAdapter,
  resetAdapter,
  type SendContextResult,
  UnknownAdapter,
  WindsurfAdapter,
} from './adapters/index.js';
