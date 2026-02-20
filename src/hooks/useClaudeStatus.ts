import { readFileSync } from 'node:fs';
import type { AgentActivityStatus } from './useAgentStatus.js';
import { useAgentStatus } from './useAgentStatus.js';

/** @deprecated Use AgentActivityStatus from useAgentStatus instead */
export type AgentStatus = AgentActivityStatus;

export const STATUS_FILE_PATH = '/tmp/mumbl-claude-status';

export function readStatusFile(filePath: string = STATUS_FILE_PATH): AgentStatus {
  try {
    const content = readFileSync(filePath, 'utf-8').trim();
    return content === 'thinking' ? 'thinking' : 'idle';
  } catch {
    return 'idle';
  }
}

/** @deprecated Use useAgentStatus instead */
export function useClaudeStatus(): AgentActivityStatus {
  const { status } = useAgentStatus();
  return status;
}
