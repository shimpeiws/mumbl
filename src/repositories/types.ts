/**
 * Journal entry metadata
 * Extensible object for tags, mood, location, etc.
 */
export interface EntryMetadata {
  tags?: string[];
  mood?: string;
  location?: string;
  [key: string]: unknown; // Allow arbitrary metadata
}

/**
 * Core journal entry structure
 */
export interface JournalEntry {
  id: string; // UUID v4
  timestamp: Date; // Entry date/time
  content: string; // Markdown-formatted content
  metadata: EntryMetadata; // Extensible metadata object
  createdAt: Date; // When entry was created
  updatedAt: Date; // Last update time
}

/**
 * Options for creating new entries
 */
export interface CreateEntryOptions {
  content: string;
  metadata?: EntryMetadata;
  timestamp?: Date; // Defaults to now
}

/**
 * Options for updating entries
 */
export interface UpdateEntryOptions {
  content?: string;
  metadata?: EntryMetadata;
  timestamp?: Date;
}

/**
 * Query options for listing entries
 */
export interface ListEntriesOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  since?: Date; // Filter entries after this date
  until?: Date; // Filter entries before this date
}

/**
 * Database row representation of an entry
 * Used internally by repository layer
 */
export interface EntryRow {
  id: string;
  timestamp: number; // Unix timestamp in seconds
  content: string;
  metadata: string | null; // JSON string
  created_at: number; // Unix timestamp in seconds
  updated_at: number; // Unix timestamp in seconds
}
