/**
 * Conversation domain types
 */

export interface Conversation {
  id: string;
  title: string | null;
  startedAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
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
  memoryType: 'buffer' | 'summary' | 'context';
  content: Record<string, unknown>;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}
