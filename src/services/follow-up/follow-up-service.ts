import type { Database as DatabaseType } from 'better-sqlite3';
import {
  type FollowUpRepositoryInterface,
  createFollowUpRepository,
} from '../../repositories/follow-up-repository.js';
import { generateEntryId } from '../id-service.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import { createFollowUpEvaluationPrompt } from '../llm/prompts.js';
import type { FollowUp, FollowUpConfig, FollowUpEvaluation, IntervalType } from './types.js';

const INTERVAL_MS: Record<IntervalType, number> = {
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

const DEFAULT_CONFIG: FollowUpConfig = {
  enabled: true,
  defaultInterval: '1d',
};

/**
 * Follow-up service interface
 */
export interface FollowUpServiceInterface {
  evaluateEntry(entryId: string, content: string): Promise<void>;
  schedule(entryId: string, interval: IntervalType, promptText?: string): FollowUp;
  getDue(): FollowUp[];
  markShown(followUpId: string): void;
  dismiss(followUpId: string): void;
  respond(followUpId: string, responseEntryId: string): void;
}

/**
 * Parse LLM evaluation response into a FollowUpEvaluation
 */
export function parseEvaluation(
  response: string,
  defaultInterval: IntervalType,
): FollowUpEvaluation {
  try {
    const parsed = JSON.parse(response) as Record<string, unknown>;
    const shouldFollowUp = parsed['shouldFollowUp'] === true;
    const interval = validateInterval(parsed['interval']) ?? defaultInterval;
    const reason = typeof parsed['reason'] === 'string' ? parsed['reason'] : '';

    return { shouldFollowUp, interval, reason };
  } catch {
    return { shouldFollowUp: false, interval: defaultInterval, reason: '' };
  }
}

function validateInterval(value: unknown): IntervalType | null {
  if (value === '1d' || value === '3d' || value === '1w') {
    return value;
  }
  return null;
}

/**
 * Create a follow-up service
 */
export function createFollowUpService(
  db: DatabaseType,
  llmService: LLMServiceInterface,
  config: Partial<FollowUpConfig> = {},
): FollowUpServiceInterface {
  const currentConfig: FollowUpConfig = { ...DEFAULT_CONFIG, ...config };
  const repository: FollowUpRepositoryInterface = createFollowUpRepository(db);

  const evaluateEntry = async (entryId: string, content: string): Promise<void> => {
    if (!currentConfig.enabled) {
      return;
    }

    const messages = createFollowUpEvaluationPrompt(content);
    const response = await llmService.chat(messages[1]?.content ?? '', {
      includeHistory: false,
    });

    const evaluation = parseEvaluation(response.content, currentConfig.defaultInterval);

    if (evaluation.shouldFollowUp) {
      schedule(entryId, evaluation.interval);
    }
  };

  const schedule = (entryId: string, interval: IntervalType, promptText?: string): FollowUp => {
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + INTERVAL_MS[interval]);

    const followUp: FollowUp = {
      id: generateEntryId(),
      entryId,
      scheduledAt,
      intervalType: interval,
      status: 'pending',
      promptText: promptText ?? null,
      responseEntryId: null,
      createdAt: now,
      shownAt: null,
    };

    repository.insert(followUp);
    return followUp;
  };

  const getDue = (): FollowUp[] => {
    return repository.findDue(new Date());
  };

  const markShown = (followUpId: string): void => {
    repository.update(followUpId, {
      status: 'shown',
      shownAt: new Date(),
    });
  };

  const dismiss = (followUpId: string): void => {
    repository.update(followUpId, { status: 'dismissed' });
  };

  const respond = (followUpId: string, responseEntryId: string): void => {
    repository.update(followUpId, {
      status: 'responded',
      responseEntryId,
    });
  };

  return {
    evaluateEntry,
    schedule,
    getDue,
    markShown,
    dismiss,
    respond,
  };
}
