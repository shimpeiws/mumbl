import type { Database as DatabaseType } from 'better-sqlite3';
import { EntryNotFoundError } from '../infrastructure/errors/domain-errors.js';
import { createEntryRepository } from '../repositories/entry-repository.js';
import type {
  CreateEntryOptions,
  JournalEntry,
  ListEntriesOptions,
  UpdateEntryOptions,
} from '../repositories/types.js';
import type { FollowUpServiceInterface } from './follow-up/follow-up-service.js';
import { generateEntryId } from './id-service.js';
import type { ReactionService } from './reaction-service.js';

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
  reactionService?: ReactionService,
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

    // Queue follow-up evaluation (fire-and-forget)
    if (followUpService) {
      followUpService.evaluateEntry(entry.id, entry.content).catch(() => {
        // Silently fail - follow-ups are non-critical
      });
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

/**
 * Legacy class export for backward compatibility
 * @deprecated Use createEntryService() instead
 */
export class EntryService implements EntryServiceInterface {
  private readonly _service: EntryServiceInterface;

  constructor(
    db: DatabaseType,
    reactionService?: ReactionService,
    followUpService?: FollowUpServiceInterface,
  ) {
    this._service = createEntryService(db, reactionService, followUpService);
  }

  create(options: CreateEntryOptions) {
    return this._service.create(options);
  }
  getById(id: string) {
    return this._service.getById(id);
  }
  list(options?: ListEntriesOptions) {
    return this._service.list(options);
  }
  update(id: string, options: UpdateEntryOptions) {
    return this._service.update(id, options);
  }
  delete(id: string) {
    return this._service.delete(id);
  }
  count() {
    return this._service.count();
  }
  search(query: string) {
    return this._service.search(query);
  }
}
