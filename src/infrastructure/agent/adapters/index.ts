// Adapter factory
export {
  createAdapter,
  createAdapterFromDetection,
  getAdapter,
  getRegisteredAdapterTypes,
  registerAdapter,
  resetAdapter,
} from './adapter-factory.js';

// Base adapter
export { BaseAgentAdapter } from './base-adapter.js';

// Concrete adapters
export { ClaudeCodeAdapter } from './claude-code-adapter.js';
export { CursorAdapter } from './cursor-adapter.js';
export { GeminiCLIAdapter } from './gemini-cli-adapter.js';
export { unknownAdapter } from './unknown-adapter.js';
export { WindsurfAdapter } from './windsurf-adapter.js';

// Types
export type {
  AgentAdapter,
  AgentCapabilities,
  AgentContext,
  AgentState,
  SendContextResult,
} from './types.js';
