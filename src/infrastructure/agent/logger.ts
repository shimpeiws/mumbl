import type { AgentDetectionResult } from './types.js';

/**
 * Log agent detection result at startup
 */
export function logAgentDetection(result: AgentDetectionResult): void {
  const agentName = formatAgentName(result.agent);
  const method = result.detectionMethod;

  if (result.agent === 'unknown') {
    console.log(`[Agent Detection] No AI coding agent detected (method: ${method})`);
  } else {
    const metadataStr = result.metadata ? ` (${formatMetadata(result.metadata)})` : '';
    console.log(`[Agent Detection] Detected: ${agentName} via ${method}${metadataStr}`);
  }
}

/**
 * Format agent type to human-readable name
 */
function formatAgentName(agent: string): string {
  const names: Record<string, string> = {
    'claude-code': 'Claude Code',
    cursor: 'Cursor',
    windsurf: 'Windsurf',
    'gemini-cli': 'Gemini CLI',
    unknown: 'Unknown',
  };
  return names[agent] ?? agent;
}

/**
 * Format metadata for logging
 */
function formatMetadata(metadata: Record<string, string>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}
