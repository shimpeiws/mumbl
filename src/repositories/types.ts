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

/**
 * Reaction types aligned with mumbl's personality
 */
export type ReactionType =
  | 'read' // Simple read receipt (default)
  | 'heard' // Acknowledgment
  | 'thinking' // Pondering
  | 'with-you' // Silent presence
  | 'custom'; // For LLM-generated reactions

/**
 * A reaction to a journal entry
 */
export interface Reaction {
  id: string;
  entryId: string;
  reactionType: ReactionType;
  content: string; // The actual display content (e.g., "·", "hearing you")
  createdAt: Date;
}

/**
 * Database row representation of a reaction
 * Used internally by repository layer
 */
export interface ReactionRow {
  id: string;
  entry_id: string;
  reaction_type: string;
  content: string;
  created_at: number; // Unix timestamp in seconds
}

/**
 * Database row representation of a conversation
 */
export interface ConversationRow {
  id: string;
  title: string | null;
  started_at: number; // Unix timestamp in seconds
  updated_at: number; // Unix timestamp in seconds
  status: string;
  metadata: string | null; // JSON string
}

/**
 * Database row representation of a conversation-entry link
 */
export interface ConversationEntryRow {
  conversation_id: string;
  entry_id: string;
  position: number;
  created_at: number; // Unix timestamp in seconds
}

/**
 * Database row representation of a conversation memory
 */
export interface ConversationMemoryRow {
  id: string;
  conversation_id: string;
  memory_type: string;
  content: string; // JSON string
  token_count: number;
  created_at: number; // Unix timestamp in seconds
  updated_at: number; // Unix timestamp in seconds
}

/**
 * Database row representation of a follow-up
 */
export interface FollowUpRow {
  id: string;
  entry_id: string;
  scheduled_at: number; // Unix timestamp in seconds
  interval_type: string;
  status: string;
  prompt_text: string | null;
  response_entry_id: string | null;
  created_at: number; // Unix timestamp in seconds
  shown_at: number | null; // Unix timestamp in seconds
}
