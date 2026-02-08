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
  type SendContextResult,
  // Factory functions (preferred)
  createAdapter,
  createAdapterFromDetection,
  createClaudeCodeAdapter,
  createCursorAdapter,
  createGeminiCLIAdapter,
  createWindsurfAdapter,
  unknownAdapter,
  // Adapter registry
  getAdapter,
  getRegisteredAdapterTypes,
  registerAdapter,
  registerAdapterClass,
  resetAdapter,
  // Legacy class exports (deprecated)
  ClaudeCodeAdapter,
  CursorAdapter,
  GeminiCLIAdapter,
  WindsurfAdapter,
} from './adapters/index.js';
