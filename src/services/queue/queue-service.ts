/**
 * Background task queue service for LLM processing
 */

import { generateEntryId } from '../id-service.js';
import type { LLMService } from '../llm/llm-service.js';
import type { ReactionService } from '../reaction-service.js';
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
 * Background processing queue for LLM tasks
 */
export class QueueService {
  private tasks: Map<string, Task<TaskPayload>> = new Map();
  private queue: string[] = [];
  private isProcessing = false;
  private isStopping = false;
  private listeners: Map<QueueEventType, Set<QueueEventCallback<QueueEventType>>> = new Map();
  private config: QueueServiceConfig;

  constructor(
    private llmService: LLMService,
    private reactionService: ReactionService | null,
    config: Partial<QueueServiceConfig> = {},
  ) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  /**
   * Add a task to the queue
   */
  enqueue<T extends TaskPayload>(type: TaskType, payload: T): string {
    if (this.isStopping) {
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
      maxRetries: this.config.retryConfig.maxRetries,
    };

    this.tasks.set(id, task as Task<TaskPayload>);
    this.queue.push(id);

    this.emit('taskAdded', task as Task<TaskPayload>);
    this.emit('statusChanged', this.getStatus());

    // Auto-start processing if not already running
    if (!this.isProcessing && !this.isStopping) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Enqueue a reaction task
   */
  enqueueReact(entryId: string, entryContent: string): string {
    return this.enqueue<ReactTaskPayload>('react', { entryId, entryContent });
  }

  /**
   * Enqueue a reflection task
   */
  enqueueReflect(entryId: string, entryContent: string): string {
    return this.enqueue<ReflectTaskPayload>('reflect', { entryId, entryContent });
  }

  /**
   * Enqueue a summarization task
   */
  enqueueSummarize(entryIds: string[], entryContents: string[]): string {
    return this.enqueue<SummarizeTaskPayload>('summarize', { entryIds, entryContents });
  }

  /**
   * Enqueue a chat task
   */
  enqueueChat(message: string, sessionId?: string): string {
    return this.enqueue<ChatTaskPayload>('chat', { message, sessionId });
  }

  /**
   * Cancel a pending task
   * Returns true if the task was cancelled, false if not found or already running
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    // Remove from queue
    const queueIndex = this.queue.indexOf(taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }

    // Update task status
    task.status = 'failed';
    task.error = 'Cancelled';
    task.completedAt = new Date();

    this.emit('taskFailed', task);
    this.emit('statusChanged', this.getStatus());

    return true;
  }

  /**
   * Get queue status summary
   */
  getStatus(): QueueStatus {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const task of this.tasks.values()) {
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

    return { pending, running, completed, failed, total: this.tasks.size };
  }

  /**
   * Get a specific task by ID
   */
  getTask(taskId: string): Task<TaskPayload> | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks with optional status filter
   */
  getTasks(status?: Task['status']): Task<TaskPayload>[] {
    const tasks = Array.from(this.tasks.values());
    if (status) {
      return tasks.filter((t) => t.status === status);
    }
    return tasks;
  }

  /**
   * Start queue processing
   */
  start(): void {
    if (this.isProcessing || this.isStopping) {
      return;
    }
    this.processQueue();
  }

  /**
   * Stop queue processing gracefully
   * Waits for running tasks to complete (with timeout)
   */
  async stop(timeoutMs = 30000): Promise<void> {
    this.isStopping = true;

    // Wait for running tasks to complete
    const startTime = Date.now();
    while (this.isProcessing && Date.now() - startTime < timeoutMs) {
      await sleep(100);
    }

    // Clear pending tasks
    for (const taskId of this.queue) {
      const task = this.tasks.get(taskId);
      if (task && task.status === 'pending') {
        task.status = 'failed';
        task.error = 'Queue shutdown';
        task.completedAt = new Date();
        this.emit('taskFailed', task);
      }
    }
    this.queue = [];

    this.emit('statusChanged', this.getStatus());
    this.isStopping = false;
  }

  /**
   * Subscribe to queue events
   * Returns unsubscribe function
   */
  on<K extends QueueEventType>(event: K, callback: QueueEventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback as QueueEventCallback<QueueEventType>);

    return () => {
      this.listeners.get(event)?.delete(callback as QueueEventCallback<QueueEventType>);
    };
  }

  /**
   * Clear completed and failed tasks from memory
   */
  clearFinished(): void {
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(taskId);
      }
    }
    this.emit('statusChanged', this.getStatus());
  }

  /**
   * Check if the queue is currently processing
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  private emit<K extends QueueEventType>(event: K, data: QueueEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.isStopping) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && !this.isStopping) {
      const taskId = this.queue.shift();
      if (!taskId) break;

      const task = this.tasks.get(taskId);
      if (!task || task.status !== 'pending') continue;

      await this.executeTask(task);
    }

    this.isProcessing = false;
  }

  private async executeTask(task: Task<TaskPayload>): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    this.emit('taskStarted', task);
    this.emit('statusChanged', this.getStatus());

    try {
      await withRetry(
        async () => {
          await this.processTask(task);
        },
        this.config.retryConfig,
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
      this.emit('taskCompleted', task);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : String(error);
      this.emit('taskFailed', task);
    }

    this.emit('statusChanged', this.getStatus());
  }

  private async processTask(task: Task<TaskPayload>): Promise<void> {
    switch (task.type) {
      case 'react':
        await this.processReactTask(task as Task<ReactTaskPayload>);
        break;
      case 'reflect':
        await this.processReflectTask(task as Task<ReflectTaskPayload>);
        break;
      case 'summarize':
        await this.processSummarizeTask(task as Task<SummarizeTaskPayload>);
        break;
      case 'chat':
        await this.processChatTask(task as Task<ChatTaskPayload>);
        break;
    }
  }

  private async processReactTask(task: Task<ReactTaskPayload>): Promise<void> {
    const { entryId, entryContent } = task.payload;

    // Delegate to ReactionService if available, which handles LLM call and storage
    if (this.reactionService) {
      await this.reactionService.generateReaction(entryId, entryContent);
    } else {
      // Fallback: just call LLM without storing
      await this.llmService.react(entryContent);
    }
  }

  private async processReflectTask(task: Task<ReflectTaskPayload>): Promise<void> {
    const { entryContent } = task.payload;
    await this.llmService.reflect(entryContent);
  }

  private async processSummarizeTask(task: Task<SummarizeTaskPayload>): Promise<void> {
    const { entryContents } = task.payload;
    await this.llmService.summarize(entryContents);
  }

  private async processChatTask(task: Task<ChatTaskPayload>): Promise<void> {
    const { message, sessionId } = task.payload;
    await this.llmService.chat(message, { sessionId });
  }
}
