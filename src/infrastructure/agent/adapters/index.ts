// Adapter factory
export {
  createAdapter,
  createAdapterFromDetection,
  getAdapter,
  getRegisteredAdapterTypes,
  registerAdapter,
  registerAdapterClass,
  resetAdapter,
} from './adapter-factory.js';

// Adapter factory functions
export { createClaudeCodeAdapter } from './claude-code-adapter.js';
export { createCursorAdapter } from './cursor-adapter.js';
export { createGeminiCLIAdapter } from './gemini-cli-adapter.js';
export { createWindsurfAdapter } from './windsurf-adapter.js';
export { unknownAdapter } from './unknown-adapter.js';

// Legacy class exports (deprecated, for backward compatibility)
export { ClaudeCodeAdapter } from './claude-code-adapter.js';
export { CursorAdapter } from './cursor-adapter.js';
export { GeminiCLIAdapter } from './gemini-cli-adapter.js';
export { WindsurfAdapter } from './windsurf-adapter.js';

// Types
export type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';
