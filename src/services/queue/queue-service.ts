/**
 * Background task queue service for LLM processing
 */

import { generateEntryId } from '../id-service.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import type { ReactionServiceInterface } from '../reaction-service.js';
import { shouldRetryError, sleep, withRetry } from './retry.js';
import {
  type ChatTaskPayload,
  DEFAULT_QUEUE_CONFIG,
  type QueueEventCallback,
  type QueueEventType,
  type QueueEvents,
  type QueueServiceConfig,
  type QueueStatus,
  type ReactTaskPayload,
  type ReflectTaskPayload,
  type SummarizeTaskPayload,
  type Task,
  type TaskPayload,
  type TaskType,
} from './types.js';

/**
 * Queue service interface
 */
export interface QueueServiceInterface {
  enqueue<T extends TaskPayload>(type: TaskType, payload: T): string;
  enqueueReact(entryId: string, entryContent: string): string;
  enqueueReflect(entryId: string, entryContent: string): string;
  enqueueSummarize(entryIds: string[], entryContents: string[]): string;
  enqueueChat(message: string, sessionId?: string): string;
  cancel(taskId: string): boolean;
  getStatus(): QueueStatus;
  getTask(taskId: string): Task<TaskPayload> | undefined;
  getTasks(status?: Task<TaskPayload>['status']): Task<TaskPayload>[];
  start(): void;
  stop(timeoutMs?: number): Promise<void>;
  on<K extends QueueEventType>(event: K, callback: QueueEventCallback<K>): () => void;
  clearFinished(): void;
  isActive(): boolean;
}

/**
 * Create a background processing queue for LLM tasks
 */
export function createQueueService(
  llmService: LLMServiceInterface,
  reactionService: ReactionServiceInterface | null,
  config: Partial<QueueServiceConfig> = {},
): QueueServiceInterface {
  const tasks: Map<string, Task<TaskPayload>> = new Map();
  let queue: string[] = [];
  let isProcessing = false;
  let isStopping = false;
  const listeners: Map<QueueEventType, Set<QueueEventCallback<QueueEventType>>> = new Map();
  const queueConfig: QueueServiceConfig = { ...DEFAULT_QUEUE_CONFIG, ...config };

  const emit = <K extends QueueEventType>(event: K, data: QueueEvents[K]): void => {
    const callbacks = listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch {
          // Ignore listener errors
        }
      }
    }
  };

  const getStatus = (): QueueStatus => {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const task of tasks.values()) {
      switch (task.status) {
        case 'pending':
          pending++;
          break;
        case 'running':
          running++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return { pending, running, completed, failed, total: tasks.size };
  };

  const processReactTask = async (task: Task<ReactTaskPayload>): Promise<void> => {
    const { entryId, entryContent } = task.payload;

    // Delegate to ReactionService if available, which handles LLM call and storage
    if (reactionService) {
      await reactionService.generateReaction(entryId, entryContent);
    } else {
      // Fallback: just call LLM without storing
      await llmService.react(entryContent);
    }
  };

  const processReflectTask = async (task: Task<ReflectTaskPayload>): Promise<void> => {
    const { entryContent } = task.payload;
    await llmService.reflect(entryContent);
  };

  const processSummarizeTask = async (task: Task<SummarizeTaskPayload>): Promise<void> => {
    const { entryContents } = task.payload;
    await llmService.summarize(entryContents);
  };

  const processChatTask = async (task: Task<ChatTaskPayload>): Promise<void> => {
    const { message, sessionId } = task.payload;
    await llmService.chat(message, { sessionId });
  };

  const processTask = async (task: Task<TaskPayload>): Promise<void> => {
    switch (task.type) {
      case 'react':
        await processReactTask(task as Task<ReactTaskPayload>);
        break;
      case 'reflect':
        await processReflectTask(task as Task<ReflectTaskPayload>);
        break;
      case 'summarize':
        await processSummarizeTask(task as Task<SummarizeTaskPayload>);
        break;
      case 'chat':
        await processChatTask(task as Task<ChatTaskPayload>);
        break;
    }
  };

  const executeTask = async (task: Task<TaskPayload>): Promise<void> => {
    task.status = 'running';
    task.startedAt = new Date();
    emit('taskStarted', task);
    emit('statusChanged', getStatus());

    try {
      await withRetry(
        async () => {
          await processTask(task);
        },
        queueConfig.retryConfig,
        (error) => {
          if (shouldRetryError(error) && task.retryCount < task.maxRetries) {
            task.retryCount++;
            return true;
          }
          return false;
        },
      );

      task.status = 'completed';
      task.completedAt = new Date();
      emit('taskCompleted', task);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : String(error);
      emit('taskFailed', task);
    }

    emit('statusChanged', getStatus());
  };

  const processQueue = async (): Promise<void> => {
    if (isProcessing || isStopping) {
      return;
    }

    isProcessing = true;

    while (queue.length > 0 && !isStopping) {
      const taskId = queue.shift();
      if (!taskId) break;

      const task = tasks.get(taskId);
      if (!task || task.status !== 'pending') continue;

      await executeTask(task);
    }

    isProcessing = false;
  };

  const enqueue = <T extends TaskPayload>(type: TaskType, payload: T): string => {
    if (isStopping) {
      throw new Error('Queue is stopping, cannot accept new tasks');
    }

    const id = generateEntryId();
    const task: Task<T> = {
      id,
      type,
      status: 'pending',
      payload,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: queueConfig.retryConfig.maxRetries,
    };

    tasks.set(id, task as Task<TaskPayload>);
    queue.push(id);

    emit('taskAdded', task as Task<TaskPayload>);
    emit('statusChanged', getStatus());

    // Auto-start processing if not already running
    if (!isProcessing && !isStopping) {
      processQueue();
    }

    return id;
  };

  const enqueueReact = (entryId: string, entryContent: string): string => {
    return enqueue<ReactTaskPayload>('react', { entryId, entryContent });
  };

  const enqueueReflect = (entryId: string, entryContent: string): string => {
    return enqueue<ReflectTaskPayload>('reflect', { entryId, entryContent });
  };

  const enqueueSummarize = (entryIds: string[], entryContents: string[]): string => {
    return enqueue<SummarizeTaskPayload>('summarize', { entryIds, entryContents });
  };

  const enqueueChat = (message: string, sessionId?: string): string => {
    return enqueue<ChatTaskPayload>('chat', { message, sessionId });
  };

  const cancel = (taskId: string): boolean => {
    const task = tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    // Remove from queue
    const queueIndex = queue.indexOf(taskId);
    if (queueIndex !== -1) {
      queue.splice(queueIndex, 1);
    }

    // Update task status
    task.status = 'failed';
    task.error = 'Cancelled';
    task.completedAt = new Date();

    emit('taskFailed', task);
    emit('statusChanged', getStatus());

    return true;
  };

  const getTask = (taskId: string): Task<TaskPayload> | undefined => {
    return tasks.get(taskId);
  };

  const getTasks = (status?: Task<TaskPayload>['status']): Task<TaskPayload>[] => {
    const allTasks = Array.from(tasks.values());
    if (status) {
      return allTasks.filter((t) => t.status === status);
    }
    return allTasks;
  };

  const start = (): void => {
    if (isProcessing || isStopping) {
      return;
    }
    processQueue();
  };

  const stop = async (timeoutMs = 30000): Promise<void> => {
    isStopping = true;

    // Wait for running tasks to complete
    const startTime = Date.now();
    while (isProcessing && Date.now() - startTime < timeoutMs) {
      await sleep(100);
    }

    // Clear pending tasks
    for (const taskId of queue) {
      const task = tasks.get(taskId);
      if (task && task.status === 'pending') {
        task.status = 'failed';
        task.error = 'Queue shutdown';
        task.completedAt = new Date();
        emit('taskFailed', task);
      }
    }
    queue = [];

    emit('statusChanged', getStatus());
    isStopping = false;
  };

  const on = <K extends QueueEventType>(
    event: K,
    callback: QueueEventCallback<K>,
  ): (() => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(callback as QueueEventCallback<QueueEventType>);

    return () => {
      listeners.get(event)?.delete(callback as QueueEventCallback<QueueEventType>);
    };
  };

  const clearFinished = (): void => {
    for (const [taskId, task] of tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        tasks.delete(taskId);
      }
    }
    emit('statusChanged', getStatus());
  };

  const isActive = (): boolean => {
    return isProcessing;
  };

  return {
    enqueue,
    enqueueReact,
    enqueueReflect,
    enqueueSummarize,
    enqueueChat,
    cancel,
    getStatus,
    getTask,
    getTasks,
    start,
    stop,
    on,
    clearFinished,
    isActive,
  };
}
