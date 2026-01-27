import type { Database as DatabaseType } from 'better-sqlite3';
import { EntryRepository } from '../storage/entry-repository.js';
import type {
  CreateEntryOptions,
  JournalEntry,
  ListEntriesOptions,
  UpdateEntryOptions,
} from '../storage/types.js';
import { generateEntryId } from './id-generator.js';

/**
 * High-level API for managing journal entries
 */
export class EntryManager {
  private repository: EntryRepository;

  constructor(db: DatabaseType) {
    this.repository = new EntryRepository(db);
  }

  /**
   * Create a new journal entry
   */
  create(options: CreateEntryOptions): JournalEntry {
    const now = new Date();
    const entry: JournalEntry = {
      id: generateEntryId(),
      timestamp: options.timestamp ?? now,
      content: options.content,
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.repository.insert(entry);
    return entry;
  }

  /**
   * Get entry by ID
   * Returns null if not found
   */
  getById(id: string): JournalEntry | null {
    return this.repository.findById(id);
  }

  /**
   * List entries with optional filtering
   */
  list(options?: ListEntriesOptions): JournalEntry[] {
    return this.repository.findAll(options);
  }

  /**
   * Update an existing entry
   * Returns the updated entry, or null if not found
   */
  update(id: string, options: UpdateEntryOptions): JournalEntry | null {
    try {
      return this.repository.update(id, options);
    } catch (error) {
      // If entry not found, return null instead of throwing
      if (error instanceof Error && error.name === 'EntryNotFoundError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete an entry by ID
   * Returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    return this.repository.delete(id);
  }

  /**
   * Count total entries
   */
  count(): number {
    return this.repository.count();
  }

  /**
   * Search entries by content (simple substring match)
   */
  search(query: string): JournalEntry[] {
    return this.repository.search(query);
  }
}
