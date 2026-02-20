import { useEffect, useRef } from 'react';
import { type AgentStatusInfo, AgentType } from './useAgentStatus.js';

export const THINKING_FRAMES = ['\u{1F9E0}', '\u{1F4AD}', '\u{1F914}', '\u26A1'] as const;
export const DOT_FRAMES = ['.', '..', '...'] as const;
const ANIMATION_INTERVAL_MS = 500;

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

export function getTitleFrame(statusInfo: AgentStatusInfo, frame: number): string {
  if (statusInfo.status === 'thinking') {
    const agentName = getAgentDisplayName(statusInfo.agent);
    const emoji = THINKING_FRAMES[frame % THINKING_FRAMES.length];
    const dots = DOT_FRAMES[frame % DOT_FRAMES.length];
    return `${emoji} ${agentName} thinking${dots}`;
  }
  return 'mumbl';
}

export function useTerminalTitle(statusInfo: AgentStatusInfo): void {
  const frameRef = useRef(0);

  useEffect(() => {
    if (statusInfo.status === 'thinking') {
      frameRef.current = 0;
      setTerminalTitle(getTitleFrame(statusInfo, 0));

      const interval = setInterval(() => {
        frameRef.current += 1;
        setTerminalTitle(getTitleFrame(statusInfo, frameRef.current));
      }, ANIMATION_INTERVAL_MS);

      return () => {
        clearInterval(interval);
        setTerminalTitle('mumbl');
      };
    }

    setTerminalTitle('mumbl');
    return undefined;
  }, [statusInfo]);
}
