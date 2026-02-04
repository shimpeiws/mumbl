/**
 * Task queue types for background LLM processing
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TaskType = 'react' | 'reflect' | 'summarize' | 'chat';

/**
 * Base task interface
 */
export interface Task<T = unknown> {
  id: string;
  type: TaskType;
  status: TaskStatus;
  payload: T;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Payload for reaction generation tasks
 */
export interface ReactTaskPayload {
  entryId: string;
  entryContent: string;
}

/**
 * Payload for reflection tasks
 */
export interface ReflectTaskPayload {
  entryId: string;
  entryContent: string;
}

/**
 * Payload for summary tasks
 */
export interface SummarizeTaskPayload {
  entryIds: string[];
  entryContents: string[];
}

/**
 * Payload for chat tasks
 */
export interface ChatTaskPayload {
  message: string;
  sessionId?: string;
}

export type TaskPayload =
  | ReactTaskPayload
  | ReflectTaskPayload
  | SummarizeTaskPayload
  | ChatTaskPayload;

/**
 * Queue status summary
 */
export interface QueueStatus {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Task result after completion
 */
export interface TaskResult<T = unknown> {
  taskId: string;
  success: boolean;
  result?: T;
  error?: string;
}

/**
 * Events emitted by the queue
 */
export interface QueueEvents {
  taskAdded: Task;
  taskStarted: Task;
  taskCompleted: Task;
  taskFailed: Task;
  statusChanged: QueueStatus;
}

export type QueueEventType = keyof QueueEvents;
export type QueueEventCallback<K extends QueueEventType> = (data: QueueEvents[K]) => void;

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  multiplier: number;
  maxDelayMs: number;
}

/**
 * Queue service configuration
 */
export interface QueueServiceConfig {
  concurrency: number;
  retryConfig: RetryConfig;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
};

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: QueueServiceConfig = {
  concurrency: 1,
  retryConfig: DEFAULT_RETRY_CONFIG,
};
