import type { Database as DatabaseType } from 'better-sqlite3';
import { EntryNotFoundError } from '../infrastructure/errors/domain-errors.js';
import { createEntryRepository } from '../repositories/entry-repository.js';
import type {
  CreateEntryOptions,
  JournalEntry,
  ListEntriesOptions,
  UpdateEntryOptions,
} from '../repositories/types.js';
import { debugLog } from '../utils/log.js';
import type { ContextServiceInterface } from './context/types.js';
import type { FollowUpServiceInterface } from './follow-up/follow-up-service.js';
import { generateEntryId } from './id-service.js';
import type { ReactionServiceInterface } from './reaction-service.js';
import type { TrendServiceInterface } from './trends/types.js';

/**
 * Entry service interface
 */
export interface EntryServiceInterface {
  create(options: CreateEntryOptions): JournalEntry;
  getById(id: string): JournalEntry | null;
  list(options?: ListEntriesOptions): JournalEntry[];
  update(id: string, options: UpdateEntryOptions): JournalEntry | null;
  delete(id: string): boolean;
  count(): number;
  search(query: string): JournalEntry[];
}

/**
 * Create an entry service
 * High-level API for managing journal entries
 */
export function createEntryService(
  db: DatabaseType,
  reactionService?: ReactionServiceInterface,
  trendService?: TrendServiceInterface,
  contextService?: ContextServiceInterface,
  followUpService?: FollowUpServiceInterface,
): EntryServiceInterface {
  const repository = createEntryRepository(db);

  const create = (options: CreateEntryOptions): JournalEntry => {
    const now = new Date();
    const entry: JournalEntry = {
      id: generateEntryId(),
      timestamp: options.timestamp ?? now,
      content: options.content,
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    repository.insert(entry);

    // Queue reaction generation (non-blocking)
    if (reactionService) {
      reactionService.queueReaction(entry.id, entry.content);
    }

    // Queue trend analysis (non-blocking, fire-and-forget)
    if (trendService) {
      trendService
        .analyzeEntry(entry.id, entry.content)
        .catch((err) => debugLog('trend-analysis', err));
    }

    // Queue context extraction (non-blocking, fire-and-forget)
    if (contextService) {
      contextService
        .processEntry(entry.id, entry.content)
        .catch((err) => debugLog('context-extraction', err));
    }

    // Queue follow-up evaluation (fire-and-forget)
    if (followUpService) {
      followUpService
        .evaluateEntry(entry.id, entry.content)
        .catch((err) => debugLog('follow-up-evaluation', err));
    }

    return entry;
  };

  const getById = (id: string): JournalEntry | null => {
    return repository.findById(id);
  };

  const list = (options?: ListEntriesOptions): JournalEntry[] => {
    return repository.findAll(options);
  };

  const update = (id: string, options: UpdateEntryOptions): JournalEntry | null => {
    try {
      return repository.update(id, options);
    } catch (error) {
      if (error instanceof EntryNotFoundError) {
        return null;
      }
      throw error;
    }
  };

  const deleteEntry = (id: string): boolean => {
    return repository.delete(id);
  };

  const count = (): number => {
    return repository.count();
  };

  const search = (query: string): JournalEntry[] => {
    return repository.search(query);
  };

  return {
    create,
    getById,
    list,
    update,
    delete: deleteEntry,
    count,
    search,
  };
}
