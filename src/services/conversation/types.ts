/**
 * Conversation domain types
 */
import type { ConversationStatus, MemoryType } from '../../repositories/types.js';

export interface Conversation {
  id: string;
  title: string | null;
  startedAt: Date;
  updatedAt: Date;
  status: ConversationStatus;
  metadata: Record<string, unknown>;
}

export interface ConversationContext {
  conversation: Conversation;
  entries: Array<{ entryId: string; content: string; position: number }>;
  memory: ConversationMemory[];
}

export interface ConversationMemory {
  id: string;
  conversationId: string;
  memoryType: MemoryType;
  content: Record<string, unknown>;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}
