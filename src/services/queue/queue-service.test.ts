import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import type { ReactionServiceInterface } from '../reaction-service.js';
import { QueueService } from './queue-service.js';

// Mock LLM service
function createMockLLMService(): LLMServiceInterface {
  return {
    chat: vi.fn().mockResolvedValue({ content: 'response', model: 'test' }),
    stream: vi.fn(),
    summarize: vi.fn().mockResolvedValue({ content: 'summary', model: 'test' }),
    reflect: vi.fn().mockResolvedValue({ content: 'reflection', model: 'test' }),
    react: vi.fn().mockResolvedValue({ content: '·', model: 'test' }),
    healthCheck: vi.fn().mockResolvedValue({ primary: true }),
    clearHistory: vi.fn(),
    getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
  } as unknown as LLMServiceInterface;
}

// Mock Reaction service
function createMockReactionService(): ReactionServiceInterface {
  return {
    isEnabled: vi.fn().mockReturnValue(true),
    generateReaction: vi.fn().mockResolvedValue({
      id: 'reaction-1',
      entryId: 'entry-1',
      reactionType: 'custom',
      content: '·',
      createdAt: new Date(),
    }),
    queueReaction: vi.fn(),
    getReaction: vi.fn(),
    getReactionsForEntries: vi.fn(),
    deleteReaction: vi.fn(),
    updateConfig: vi.fn(),
    getConfig: vi.fn(),
  } as unknown as ReactionServiceInterface;
}

describe('QueueService', () => {
  let llmService: LLMServiceInterface;
  let reactionService: ReactionServiceInterface;
  let queueService: QueueService;

  beforeEach(() => {
    vi.useFakeTimers();
    llmService = createMockLLMService();
    reactionService = createMockReactionService();
    queueService = new QueueService(llmService, reactionService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add a task to the queue and process it', async () => {
      const taskId = queueService.enqueueReact('entry-1', 'test content');

      expect(taskId).toBeDefined();
      expect(queueService.getTask(taskId)).toBeDefined();

      // Queue auto-starts, so task may already be running or completed
      // Wait for processing to complete
      await vi.advanceTimersByTimeAsync(100);

      expect(queueService.getTask(taskId)?.status).toBe('completed');
    });

    it('should emit taskAdded event with correct type', () => {
      const callback = vi.fn();
      queueService.on('taskAdded', callback);

      queueService.enqueueReact('entry-1', 'test content');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'react',
        }),
      );
    });

    it('should emit statusChanged event', () => {
      const callback = vi.fn();
      queueService.on('statusChanged', callback);

      queueService.enqueueReact('entry-1', 'test content');

      // At least one status change should have occurred
      expect(callback).toHaveBeenCalled();
    });

    it('should throw when queue is stopping', async () => {
      // Make a task that takes time so we can test during stop
      vi.mocked(reactionService.generateReaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 500)),
      );

      // Start a task to trigger processing
      queueService.enqueueReact('entry-1', 'test');

      // Let task start
      await vi.advanceTimersByTimeAsync(10);

      // Now start stopping
      const stopPromise = queueService.stop(1000);

      // Should throw when trying to enqueue while stopping
      expect(() => queueService.enqueueReact('entry-2', 'test')).toThrow(
        'Queue is stopping, cannot accept new tasks',
      );

      // Complete the stop
      await vi.advanceTimersByTimeAsync(600);
      await stopPromise;
    });
  });

  describe('cancel', () => {
    it('should cancel a pending task in queue', async () => {
      // Make first task take a long time so second stays pending
      vi.mocked(reactionService.generateReaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      );

      // First task will start processing
      queueService.enqueueReact('entry-1', 'content 1');

      // Let first task start
      await vi.advanceTimersByTimeAsync(10);

      // Second task should be pending while first is running
      const taskId = queueService.enqueueReact('entry-2', 'content 2');

      const result = queueService.cancel(taskId);

      expect(result).toBe(true);
      expect(queueService.getTask(taskId)?.status).toBe('failed');
      expect(queueService.getTask(taskId)?.error).toBe('Cancelled');

      // Clean up
      await vi.advanceTimersByTimeAsync(1000);
    });

    it('should return false for non-existent task', () => {
      const result = queueService.cancel('non-existent');

      expect(result).toBe(false);
    });

    it('should return false for running task', async () => {
      // Create a task that takes time to process
      vi.mocked(reactionService.generateReaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      );

      const taskId = queueService.enqueueReact('entry-1', 'test content');

      // Wait for task to start
      await vi.advanceTimersByTimeAsync(10);

      const result = queueService.cancel(taskId);

      expect(result).toBe(false);

      // Clean up
      await vi.advanceTimersByTimeAsync(1000);
    });
  });

  describe('getStatus', () => {
    it('should return correct status counts after tasks complete', async () => {
      queueService.enqueueReact('entry-1', 'content 1');
      queueService.enqueueReact('entry-2', 'content 2');
      queueService.enqueueReflect('entry-3', 'content 3');

      // Wait for all tasks to complete
      await vi.advanceTimersByTimeAsync(100);

      const status = queueService.getStatus();

      expect(status).toEqual({
        pending: 0,
        running: 0,
        completed: 3,
        failed: 0,
        total: 3,
      });
    });

    it('should show running and pending tasks during processing', async () => {
      // Make tasks take time
      vi.mocked(reactionService.generateReaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 500)),
      );

      queueService.enqueueReact('entry-1', 'content 1');
      queueService.enqueueReact('entry-2', 'content 2');
      queueService.enqueueReact('entry-3', 'content 3');

      // Let first task start
      await vi.advanceTimersByTimeAsync(10);

      const status = queueService.getStatus();

      expect(status.running).toBe(1);
      expect(status.pending).toBe(2);

      // Clean up
      await vi.advanceTimersByTimeAsync(2000);
    });
  });

  describe('getTasks', () => {
    it('should return all tasks', async () => {
      queueService.enqueueReact('entry-1', 'content 1');
      queueService.enqueueReflect('entry-2', 'content 2');

      // Wait for processing
      await vi.advanceTimersByTimeAsync(100);

      const tasks = queueService.getTasks();

      expect(tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      // Make first task take time
      vi.mocked(reactionService.generateReaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 500)),
      );

      queueService.enqueueReact('entry-1', 'content 1');

      // Let first task start
      await vi.advanceTimersByTimeAsync(10);

      // Add second task (will be pending)
      const taskId = queueService.enqueueReact('entry-2', 'content 2');

      // Cancel second task
      queueService.cancel(taskId);

      const runningTasks = queueService.getTasks('running');
      const failedTasks = queueService.getTasks('failed');

      expect(runningTasks).toHaveLength(1);
      expect(failedTasks).toHaveLength(1);

      // Clean up
      await vi.advanceTimersByTimeAsync(500);
    });
  });

  describe('task processing', () => {
    it('should process react tasks', async () => {
      queueService.enqueueReact('entry-1', 'test content');

      await vi.advanceTimersByTimeAsync(100);

      expect(reactionService.generateReaction).toHaveBeenCalledWith('entry-1', 'test content');
    });

    it('should process reflect tasks', async () => {
      queueService.enqueueReflect('entry-1', 'test content');

      await vi.advanceTimersByTimeAsync(100);

      expect(llmService.reflect).toHaveBeenCalledWith('test content');
    });

    it('should process summarize tasks', async () => {
      queueService.enqueueSummarize(['entry-1'], ['content 1']);

      await vi.advanceTimersByTimeAsync(100);

      expect(llmService.summarize).toHaveBeenCalledWith(['content 1']);
    });

    it('should process chat tasks', async () => {
      queueService.enqueueChat('hello', 'session-1');

      await vi.advanceTimersByTimeAsync(100);

      expect(llmService.chat).toHaveBeenCalledWith('hello', { sessionId: 'session-1' });
    });

    it('should process tasks in FIFO order', async () => {
      const order: string[] = [];

      vi.mocked(llmService.reflect).mockImplementation(async (content) => {
        order.push(content);
        return { content: 'reflection', model: 'test' };
      });

      queueService.enqueueReflect('entry-1', 'first');
      queueService.enqueueReflect('entry-2', 'second');
      queueService.enqueueReflect('entry-3', 'third');

      await vi.advanceTimersByTimeAsync(100);

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('should emit task lifecycle events', async () => {
      const startedCallback = vi.fn();
      const completedCallback = vi.fn();

      queueService.on('taskStarted', startedCallback);
      queueService.on('taskCompleted', completedCallback);

      queueService.enqueueReflect('entry-1', 'test content');

      await vi.advanceTimersByTimeAsync(100);

      expect(startedCallback).toHaveBeenCalled();
      expect(completedCallback).toHaveBeenCalled();
    });

    it('should mark task as completed on success', async () => {
      const taskId = queueService.enqueueReflect('entry-1', 'test content');

      await vi.advanceTimersByTimeAsync(100);

      const task = queueService.getTask(taskId);
      expect(task?.status).toBe('completed');
      expect(task?.completedAt).toBeDefined();
    });

    it('should mark task as failed on error', async () => {
      vi.mocked(llmService.reflect).mockRejectedValue(new Error('Test error'));

      const taskId = queueService.enqueueReflect('entry-1', 'test content');

      // Wait for all retries
      await vi.advanceTimersByTimeAsync(10000);

      const task = queueService.getTask(taskId);
      expect(task?.status).toBe('failed');
      expect(task?.error).toBe('Test error');
    });
  });

  describe('event subscription', () => {
    it('should allow subscribing to events', () => {
      const callback = vi.fn();
      queueService.on('statusChanged', callback);

      queueService.enqueueReact('entry-1', 'test');

      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = queueService.on('statusChanged', callback);

      queueService.enqueueReact('entry-1', 'test');
      expect(callback).toHaveBeenCalledTimes(2); // taskAdded + statusChanged

      callback.mockClear();
      unsubscribe();

      queueService.enqueueReact('entry-2', 'test');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should wait for running tasks to complete', async () => {
      vi.mocked(llmService.reflect).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ content: 'done', model: 'test' }), 500),
          ),
      );

      const taskId = queueService.enqueueReflect('entry-1', 'test');

      // Let task start
      await vi.advanceTimersByTimeAsync(10);

      const stopPromise = queueService.stop(1000);

      // Advance to let task complete
      await vi.advanceTimersByTimeAsync(600);
      await stopPromise;

      const task = queueService.getTask(taskId);
      expect(task?.status).toBe('completed');
    });

    it('should mark pending tasks as failed on shutdown', async () => {
      // Make tasks take time so we have pending tasks in the queue
      vi.mocked(reactionService.generateReaction).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      );

      // Enqueue multiple tasks - first will start, rest will be pending
      queueService.enqueueReact('entry-1', 'content 1');
      queueService.enqueueReact('entry-2', 'content 2');
      queueService.enqueueReact('entry-3', 'content 3');

      // Let first task start
      await vi.advanceTimersByTimeAsync(10);

      const statusBefore = queueService.getStatus();
      expect(statusBefore.running).toBe(1);
      expect(statusBefore.pending).toBe(2);

      // Stop the queue
      const stopPromise = queueService.stop(100);
      await vi.advanceTimersByTimeAsync(200);
      await stopPromise;

      // Pending tasks should be marked as failed
      const failedTasks = queueService.getTasks('failed');
      expect(failedTasks.length).toBeGreaterThanOrEqual(2);
      expect(failedTasks.some((t) => t.error === 'Queue shutdown')).toBe(true);
    });

    it('should timeout if tasks take too long', async () => {
      vi.mocked(llmService.reflect).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ content: 'done', model: 'test' }), 5000),
          ),
      );

      queueService.enqueueReflect('entry-1', 'test');

      // Let task start
      await vi.advanceTimersByTimeAsync(10);

      const stopPromise = queueService.stop(100);

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(200);
      await stopPromise;

      // Queue should have stopped - verify by checking we can't enqueue new tasks
      // or by checking the queue status
      const status = queueService.getStatus();
      expect(status.pending).toBe(0);
    });
  });

  describe('clearFinished', () => {
    it('should remove completed and failed tasks', async () => {
      // Complete a task
      queueService.enqueueReflect('entry-1', 'test 1');
      await vi.advanceTimersByTimeAsync(100);

      // Fail a task
      vi.mocked(llmService.reflect).mockRejectedValueOnce(new Error('fail'));
      queueService.enqueueReflect('entry-2', 'test 2');
      await vi.advanceTimersByTimeAsync(10000);

      const statusBefore = queueService.getStatus();
      expect(statusBefore.completed).toBe(1);
      expect(statusBefore.failed).toBe(1);

      queueService.clearFinished();

      const statusAfter = queueService.getStatus();
      expect(statusAfter.total).toBe(0);
    });
  });

  describe('isActive', () => {
    it('should return true when processing', async () => {
      vi.mocked(llmService.reflect).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ content: 'done', model: 'test' }), 500),
          ),
      );

      queueService.enqueueReflect('entry-1', 'test');

      // Let processing start
      await vi.advanceTimersByTimeAsync(10);

      expect(queueService.isActive()).toBe(true);

      // Finish processing
      await vi.advanceTimersByTimeAsync(500);

      expect(queueService.isActive()).toBe(false);
    });
  });

  describe('without reaction service', () => {
    it('should fall back to LLM service for react tasks', async () => {
      const queueWithoutReaction = new QueueService(llmService, null);

      queueWithoutReaction.enqueueReact('entry-1', 'test content');

      await vi.advanceTimersByTimeAsync(100);

      expect(llmService.react).toHaveBeenCalledWith('test content');
    });
  });
});
