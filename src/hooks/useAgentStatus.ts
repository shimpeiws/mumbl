import { type FSWatcher, readFileSync, watch } from 'node:fs';
import { useEffect, useState } from 'react';

export enum AgentType {
  ClaudeCode = 'claude-code',
  GeminiCLI = 'gemini-cli',
  Cursor = 'cursor',
  Windsurf = 'windsurf',
  Unknown = 'unknown',
}

export type AgentActivityStatus = 'thinking' | 'idle';

export interface AgentStatusInfo {
  status: AgentActivityStatus;
  agent: AgentType;
}

export const AGENT_STATUS_FILE_PATH = '/tmp/mumbl-agent-status';

const DEFAULT_STATUS: AgentStatusInfo = {
  status: 'idle',
  agent: AgentType.Unknown,
};

export function parseAgentName(name: string): AgentType {
  const normalized = name.trim().toLowerCase();
  switch (normalized) {
    case 'claude-code':
      return AgentType.ClaudeCode;
    case 'gemini-cli':
      return AgentType.GeminiCLI;
    case 'cursor':
      return AgentType.Cursor;
    case 'windsurf':
      return AgentType.Windsurf;
    default:
      return AgentType.Unknown;
  }
}

export function readAgentStatusFile(filePath: string = AGENT_STATUS_FILE_PATH): AgentStatusInfo {
  try {
    const content = readFileSync(filePath, 'utf-8').trim();

    if (content.includes(':')) {
      const colonIndex = content.indexOf(':');
      const statusPart = content.substring(0, colonIndex);
      const agentPart = content.substring(colonIndex + 1);

      if (statusPart === 'thinking') {
        return { status: 'thinking', agent: parseAgentName(agentPart) };
      }
      return { status: 'idle', agent: parseAgentName(agentPart) };
    }

    if (content === 'thinking') {
      return { status: 'thinking', agent: AgentType.Unknown };
    }

    return DEFAULT_STATUS;
  } catch {
    return DEFAULT_STATUS;
  }
}

export function useAgentStatus(): AgentStatusInfo {
  const [statusInfo, setStatusInfo] = useState<AgentStatusInfo>(() => readAgentStatusFile());

  useEffect(() => {
    let watcher: FSWatcher | undefined;

    const updateStatus = () => {
      setStatusInfo(readAgentStatusFile());
    };

    try {
      watcher = watch(AGENT_STATUS_FILE_PATH, () => {
        updateStatus();
      });
    } catch {
      // File may not exist yet, polling will handle it
    }

    const interval = setInterval(updateStatus, 1000);

    return () => {
      if (watcher) {
        watcher.close();
      }
      clearInterval(interval);
    };
  }, []);

  return statusInfo;
}
