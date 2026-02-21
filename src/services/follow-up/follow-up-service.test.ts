import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeSchema } from '../../infrastructure/database/schema.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import {
  type FollowUpServiceInterface,
  createFollowUpService,
  parseEvaluation,
} from './follow-up-service.js';

describe('FollowUpService', () => {
  let db: Database.Database;
  let mockLLMService: LLMServiceInterface;
  let service: FollowUpServiceInterface;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);

    // Insert test entry for foreign key
    db.prepare(
      'INSERT INTO entries (id, timestamp, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('entry-1', 1704067200, 'Test entry content', 1704067200, 1704067200);
    db.prepare(
      'INSERT INTO entries (id, timestamp, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('entry-2', 1704067200, 'Response entry', 1704067200, 1704067200);

    mockLLMService = {
      chat: vi.fn().mockResolvedValue({
        content: '{"shouldFollowUp": true, "interval": "1d", "reason": "emotional weight"}',
        model: 'test',
      }),
      chatWithContext: vi.fn(),
      stream: vi.fn(),
      summarize: vi.fn(),
      reflect: vi.fn(),
      react: vi.fn(),
      healthCheck: vi.fn(),
      clearHistory: vi.fn(),
      getProviderInfo: vi.fn().mockReturnValue({ provider: 'ollama', model: 'test' }),
    };

    service = createFollowUpService(db, mockLLMService);
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  describe('schedule', () => {
    it('should create a pending follow-up', () => {
      const followUp = service.schedule('entry-1', '1d');

      expect(followUp.entryId).toBe('entry-1');
      expect(followUp.intervalType).toBe('1d');
      expect(followUp.status).toBe('pending');
      expect(followUp.promptText).toBeNull();
      expect(followUp.responseEntryId).toBeNull();
      expect(followUp.shownAt).toBeNull();
    });

    it('should schedule at correct interval', () => {
      const before = Date.now();
      const followUp = service.schedule('entry-1', '3d');
      const after = Date.now();

      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      expect(followUp.scheduledAt.getTime()).toBeGreaterThanOrEqual(before + threeDaysMs);
      expect(followUp.scheduledAt.getTime()).toBeLessThanOrEqual(after + threeDaysMs);
    });

    it('should accept optional prompt text', () => {
      const followUp = service.schedule('entry-1', '1d', 'Check on this');

      expect(followUp.promptText).toBe('Check on this');
    });
  });

  describe('getDue', () => {
    it('should return follow-ups that are due', () => {
      // Schedule one with a very short interval by inserting directly
      const followUp = service.schedule('entry-1', '1d');

      // Manually update scheduled_at to the past
      db.prepare('UPDATE follow_ups SET scheduled_at = ? WHERE id = ?').run(
        Math.floor(Date.now() / 1000) - 3600,
        followUp.id,
      );

      const due = service.getDue();
      expect(due).toHaveLength(1);
      expect(due[0]?.id).toBe(followUp.id);
    });

    it('should not return future follow-ups', () => {
      service.schedule('entry-1', '1w');

      const due = service.getDue();
      expect(due).toHaveLength(0);
    });
  });

  describe('markShown', () => {
    it('should update status to shown and set shownAt', () => {
      const followUp = service.schedule('entry-1', '1d');
      service.markShown(followUp.id);

      // Verify by scheduling again and checking DB directly
      const row = db
        .prepare('SELECT status, shown_at FROM follow_ups WHERE id = ?')
        .get(followUp.id) as { status: string; shown_at: number | null };
      expect(row.status).toBe('shown');
      expect(row.shown_at).not.toBeNull();
    });
  });

  describe('dismiss', () => {
    it('should update status to dismissed', () => {
      const followUp = service.schedule('entry-1', '1d');
      service.dismiss(followUp.id);

      const row = db.prepare('SELECT status FROM follow_ups WHERE id = ?').get(followUp.id) as {
        status: string;
      };
      expect(row.status).toBe('dismissed');
    });
  });

  describe('respond', () => {
    it('should update status to responded and set responseEntryId', () => {
      const followUp = service.schedule('entry-1', '1d');
      service.respond(followUp.id, 'entry-2');

      const row = db
        .prepare('SELECT status, response_entry_id FROM follow_ups WHERE id = ?')
        .get(followUp.id) as { status: string; response_entry_id: string | null };
      expect(row.status).toBe('responded');
      expect(row.response_entry_id).toBe('entry-2');
    });
  });

  describe('evaluateEntry', () => {
    it('should call LLM and schedule follow-up when shouldFollowUp is true', async () => {
      await service.evaluateEntry('entry-1', 'feeling stressed about work');

      expect(mockLLMService.chat).toHaveBeenCalled();

      // Check that a follow-up was created
      const rows = db.prepare('SELECT * FROM follow_ups WHERE entry_id = ?').all('entry-1');
      expect(rows).toHaveLength(1);
    });

    it('should not schedule follow-up when shouldFollowUp is false', async () => {
      vi.mocked(mockLLMService.chat).mockResolvedValue({
        content: '{"shouldFollowUp": false, "interval": "1d", "reason": "trivial"}',
        model: 'test',
      });

      await service.evaluateEntry('entry-1', 'had lunch');

      const rows = db.prepare('SELECT * FROM follow_ups WHERE entry_id = ?').all('entry-1');
      expect(rows).toHaveLength(0);
    });

    it('should not evaluate when disabled', async () => {
      const disabledService = createFollowUpService(db, mockLLMService, {
        enabled: false,
      });

      await disabledService.evaluateEntry('entry-1', 'test');

      expect(mockLLMService.chat).not.toHaveBeenCalled();
    });
  });
});

describe('parseEvaluation', () => {
  it('should parse valid JSON response', () => {
    const result = parseEvaluation(
      '{"shouldFollowUp": true, "interval": "3d", "reason": "health concern"}',
      '1d',
    );

    expect(result.shouldFollowUp).toBe(true);
    expect(result.interval).toBe('3d');
    expect(result.reason).toBe('health concern');
  });

  it('should return false for invalid JSON', () => {
    const result = parseEvaluation('not json', '1d');

    expect(result.shouldFollowUp).toBe(false);
    expect(result.interval).toBe('1d');
  });

  it('should use default interval for invalid interval value', () => {
    const result = parseEvaluation(
      '{"shouldFollowUp": true, "interval": "invalid", "reason": "test"}',
      '3d',
    );

    expect(result.interval).toBe('3d');
  });

  it('should handle missing reason', () => {
    const result = parseEvaluation('{"shouldFollowUp": true, "interval": "1d"}', '1d');

    expect(result.reason).toBe('');
  });
});
