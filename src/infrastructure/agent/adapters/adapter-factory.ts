import type { AgentDetectionResult } from '../types.js';
import { AgentType } from '../types.js';
import { createClaudeCodeAdapter } from './claude-code-adapter.js';
import { createCursorAdapter } from './cursor-adapter.js';
import { createGeminiCLIAdapter } from './gemini-cli-adapter.js';
import type { AgentAdapter } from './types.js';
import { unknownAdapter } from './unknown-adapter.js';
import { createWindsurfAdapter } from './windsurf-adapter.js';

/**
 * Registry of available adapter factory functions by agent type
 * Note: Unknown type uses unknownAdapter object directly (not in registry)
 */
const adapterRegistry = new Map<AgentType, () => AgentAdapter>();
adapterRegistry.set(AgentType.ClaudeCode, createClaudeCodeAdapter);
adapterRegistry.set(AgentType.Cursor, createCursorAdapter);
adapterRegistry.set(AgentType.Windsurf, createWindsurfAdapter);
adapterRegistry.set(AgentType.GeminiCLI, createGeminiCLIAdapter);

/**
 * Create an adapter for the specified agent type
 * @param agentType - Type of agent to create adapter for
 * @returns Appropriate adapter instance
 */
export function createAdapter(agentType: AgentType): AgentAdapter {
  // Special case for Unknown type (not a factory)
  if (agentType === AgentType.Unknown) {
    return unknownAdapter;
  }

  const adapterFactory = adapterRegistry.get(agentType);
  if (adapterFactory) {
    return adapterFactory();
  }
  // Fallback to unknown adapter
  return unknownAdapter;
}

/**
 * Create an adapter based on detection result
 * @param detectionResult - Result from agent detection
 * @returns Appropriate adapter instance
 */
export function createAdapterFromDetection(detectionResult: AgentDetectionResult): AgentAdapter {
  return createAdapter(detectionResult.agent);
}

/**
 * Get all registered adapter types
 * @returns Array of registered agent types
 */
export function getRegisteredAdapterTypes(): AgentType[] {
  // Include Unknown type which is handled separately
  return [...Array.from(adapterRegistry.keys()), AgentType.Unknown];
}

/**
 * Register a custom adapter factory for an agent type
 * @param agentType - Agent type to register
 * @param adapterFactory - Adapter factory function
 */
export function registerAdapter(agentType: AgentType, adapterFactory: () => AgentAdapter): void {
  adapterRegistry.set(agentType, adapterFactory);
}

/**
 * Register a custom adapter class for an agent type (legacy support)
 * @param agentType - Agent type to register
 * @param AdapterClass - Adapter class constructor
 * @deprecated Use registerAdapter with factory function instead
 */
export function registerAdapterClass(agentType: AgentType, AdapterClass: new () => AgentAdapter): void {
  adapterRegistry.set(agentType, () => new AdapterClass());
}

/**
 * Singleton adapter instance cache
 */
let currentAdapter: AgentAdapter | null = null;

/**
 * Get or create the current adapter based on detected agent
 * @param detectionResult - Optional detection result, uses cached if not provided
 * @returns Current adapter instance
 */
export function getAdapter(detectionResult?: AgentDetectionResult): AgentAdapter {
  if (detectionResult) {
    currentAdapter = createAdapterFromDetection(detectionResult);
  }
  if (!currentAdapter) {
    currentAdapter = unknownAdapter;
  }
  return currentAdapter;
}

/**
 * Reset the cached adapter (useful for testing)
 */
export function resetAdapter(): void {
  currentAdapter = null;
}
