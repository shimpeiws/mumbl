import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { QueueServiceInterface, QueueStatus } from '../../services/queue/index.js';

interface QueueContextValue {
  status: QueueStatus;
  isProcessing: boolean;
  enqueueReact: (entryId: string, entryContent: string) => string;
  enqueueReflect: (entryId: string, entryContent: string) => string;
  enqueueSummarize: (entryIds: string[], entryContents: string[]) => string;
  enqueueChat: (message: string, sessionId?: string) => string;
  cancel: (taskId: string) => boolean;
}

const defaultStatus: QueueStatus = {
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  total: 0,
};

export const QueueContext = createContext<QueueContextValue | null>(null);

export function useQueue(): QueueContextValue {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
}

interface QueueProviderProps {
  queueService: QueueServiceInterface;
  children: React.ReactNode;
}

export function QueueProvider({ queueService, children }: QueueProviderProps) {
  const [status, setStatus] = useState<QueueStatus>(defaultStatus);

  useEffect(() => {
    // Get initial status
    setStatus(queueService.getStatus());

    // Subscribe to status changes
    const unsubscribe = queueService.on('statusChanged', (newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, [queueService]);

  const enqueueReact = useCallback(
    (entryId: string, entryContent: string) => {
      return queueService.enqueueReact(entryId, entryContent);
    },
    [queueService],
  );

  const enqueueReflect = useCallback(
    (entryId: string, entryContent: string) => {
      return queueService.enqueueReflect(entryId, entryContent);
    },
    [queueService],
  );

  const enqueueSummarize = useCallback(
    (entryIds: string[], entryContents: string[]) => {
      return queueService.enqueueSummarize(entryIds, entryContents);
    },
    [queueService],
  );

  const enqueueChat = useCallback(
    (message: string, sessionId?: string) => {
      return queueService.enqueueChat(message, sessionId);
    },
    [queueService],
  );

  const cancel = useCallback(
    (taskId: string) => {
      return queueService.cancel(taskId);
    },
    [queueService],
  );

  const isProcessing = status.running > 0;

  return (
    <QueueContext.Provider
      value={{
        status,
        isProcessing,
        enqueueReact,
        enqueueReflect,
        enqueueSummarize,
        enqueueChat,
        cancel,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}
