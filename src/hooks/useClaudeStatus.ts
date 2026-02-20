import { type FSWatcher, readFileSync, watch } from 'node:fs';
import { useEffect, useState } from 'react';

export type AgentStatus = 'thinking' | 'idle';

export const STATUS_FILE_PATH = '/tmp/mumbl-claude-status';

export function readStatusFile(filePath: string = STATUS_FILE_PATH): AgentStatus {
  try {
    const content = readFileSync(filePath, 'utf-8').trim();
    return content === 'thinking' ? 'thinking' : 'idle';
  } catch {
    return 'idle';
  }
}

export function useClaudeStatus(): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>(() => readStatusFile());

  useEffect(() => {
    let watcher: FSWatcher | undefined;

    const updateStatus = () => {
      setStatus(readStatusFile());
    };

    try {
      watcher = watch(STATUS_FILE_PATH, () => {
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

  return status;
}
