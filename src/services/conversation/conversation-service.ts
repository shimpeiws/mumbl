import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import {
  type ConversationEntryRepositoryInterface,
  createConversationEntryRepository,
} from '../../repositories/conversation-entry-repository.js';
import {
  type ConversationRepositoryInterface,
  createConversationRepository,
} from '../../repositories/conversation-repository.js';
import { createEntryRepository } from '../../repositories/entry-repository.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import { type MemoryManagerInterface, createMemoryManager } from './memory-manager.js';
import type { Conversation, ConversationContext } from './types.js';

/**
 * Conversation service interface
 */
export interface ConversationServiceInterface {
  startConversation(title?: string): Conversation;
  addEntry(conversationId: string, entryId: string, content: string): void;
  getContext(conversationId: string): ConversationContext | null;
  getActiveConversation(): Conversation | null;
  archive(conversationId: string): void;
  listConversations(options?: { limit?: number; offset?: number }): Conversation[];
}

/**
 * Create a conversation service
 */
export function createConversationService(
  db: Database.Database,
  llmService: LLMServiceInterface,
): ConversationServiceInterface {
  const conversationRepo: ConversationRepositoryInterface = createConversationRepository(db);
  const conversationEntryRepo: ConversationEntryRepositoryInterface =
    createConversationEntryRepository(db);
  const entryRepo = createEntryRepository(db);
  const memoryManager: MemoryManagerInterface = createMemoryManager(db, llmService);

  const startConversation = (title?: string): Conversation => {
    const now = new Date();
    const conversation: Conversation = {
      id: randomUUID(),
      title: title ?? null,
      startedAt: now,
      updatedAt: now,
      status: 'active',
      metadata: {},
    };

    conversationRepo.insert(conversation);
    return conversation;
  };

  const addEntry = (conversationId: string, entryId: string, content: string): void => {
    const position = conversationEntryRepo.getNextPosition(conversationId);
    conversationEntryRepo.addEntry(conversationId, entryId, position);

    // Update conversation timestamp
    conversationRepo.update(conversationId, {});

    // Update memory buffer
    memoryManager.updateBuffer(conversationId, content);
  };

  const getContext = (conversationId: string): ConversationContext | null => {
    const conversation = conversationRepo.findById(conversationId);
    if (!conversation) return null;

    const conversationEntries = conversationEntryRepo.getEntriesForConversation(conversationId);

    const entries = conversationEntries.map((ce) => {
      const entry = entryRepo.findById(ce.entryId);
      return {
        entryId: ce.entryId,
        content: entry?.content ?? '',
        position: ce.position,
      };
    });

    const memory = memoryManager.getMemories(conversationId);

    return {
      conversation,
      entries,
      memory,
    };
  };

  const getActiveConversation = (): Conversation | null => {
    const active = conversationRepo.findActive();
    return active.length > 0 ? (active[0] ?? null) : null;
  };

  const archive = (conversationId: string): void => {
    conversationRepo.archive(conversationId);
  };

  const listConversations = (options?: { limit?: number; offset?: number }): Conversation[] => {
    return conversationRepo.findAll(options);
  };

  return {
    startConversation,
    addEntry,
    getContext,
    getActiveConversation,
    archive,
    listConversations,
  };
}
