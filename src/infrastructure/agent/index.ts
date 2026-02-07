// Agent detection
export {
  type AgentDetectorService,
  createAgentDetectorService,
  detectAgent,
  getAgentDetector,
} from './agent-detector.js';
export {
  claudeCodeDetector,
  cursorDetector,
  geminiCLIDetector,
  windsurfDetector,
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
  unknownAdapter,
  WindsurfAdapter,
} from './adapters/index.js';
