import { useEffect } from 'react';
import { type AgentStatusInfo, AgentType } from './useAgentStatus.js';

export function setTerminalTitle(title: string): void {
  process.stdout.write(`\x1b]0;${title}\x07`);
}

export function getAgentDisplayName(agent: AgentType): string {
  switch (agent) {
    case AgentType.ClaudeCode:
      return 'Claude';
    case AgentType.GeminiCLI:
      return 'Gemini';
    case AgentType.Cursor:
      return 'Cursor';
    case AgentType.Windsurf:
      return 'Windsurf';
    default:
      return 'Agent';
  }
}

export function getTitle(statusInfo: AgentStatusInfo): string {
  if (statusInfo.status === 'thinking') {
    const agentName = getAgentDisplayName(statusInfo.agent);
    return `\u2699 ${agentName} thinking...`;
  }
  return 'mumbl';
}

export function useTerminalTitle(statusInfo: AgentStatusInfo): void {
  useEffect(() => {
    setTerminalTitle(getTitle(statusInfo));

    return () => {
      setTerminalTitle('mumbl');
    };
  }, [statusInfo]);
}
