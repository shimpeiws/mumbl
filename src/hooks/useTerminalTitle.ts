import { useEffect } from 'react';
import type { AgentStatus } from './useClaudeStatus.js';

export function setTerminalTitle(title: string): void {
  process.stdout.write(`\x1b]0;${title}\x07`);
}

export function getTitle(status: AgentStatus): string {
  return status === 'thinking' ? '\u2699 Claude thinking...' : 'mumbl';
}

export function useTerminalTitle(status: AgentStatus): void {
  useEffect(() => {
    setTerminalTitle(getTitle(status));

    return () => {
      setTerminalTitle('mumbl');
    };
  }, [status]);
}
