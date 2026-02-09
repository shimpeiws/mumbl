import type { Database as DatabaseType } from 'better-sqlite3';
import { createReactionRepository } from '../repositories/reaction-repository.js';
import type { Reaction, ReactionType } from '../repositories/types.js';
import { generateEntryId } from './id-service.js';
import type { LLMServiceInterface } from './llm/llm-service.js';

export interface ReactionConfig {
  enabled: boolean;
  defaultReactionType: ReactionType;
  useLLM: boolean;
}

/**
 * Events emitted by ReactionService
 */
export interface ReactionEvents {
  reactionCreated: Reaction;
}

export type ReactionEventType = keyof ReactionEvents;
export type ReactionEventCallback<K extends ReactionEventType> = (data: ReactionEvents[K]) => void;

const DEFAULT_CONFIG: ReactionConfig = {
  enabled: true,
  defaultReactionType: 'read',
  useLLM: true,
};

/**
 * Reaction content templates aligned with mumbl personality
 */
const REACTION_CONTENT: Record<ReactionType, string[]> = {
  read: ['·'],
  heard: ['hearing you', '·'],
  thinking: ['💭', '...'],
  'with-you': ['·', 'here'],
  custom: [],
};

/**
 * Reaction service interface
 */
export interface ReactionServiceInterface {
  on<K extends ReactionEventType>(event: K, callback: ReactionEventCallback<K>): () => void;
  isEnabled(): boolean;
  generateReaction(entryId: string, content: string): Promise<Reaction | null>;
  queueReaction(entryId: string, content: string): void;
  getReaction(entryId: string): Reaction | null;
  getReactionsForEntries(entryIds: string[]): Map<string, Reaction>;
  deleteReaction(entryId: string): boolean;
  updateConfig(config: Partial<ReactionConfig>): void;
  getConfig(): ReactionConfig;
}

/**
 * Get default reaction content for a type
 */
function getDefaultContent(reactionType: ReactionType): string {
  const options = REACTION_CONTENT[reactionType];
  return options[0] ?? '·';
}

/**
 * Create a reaction service
 * Service for managing reactions to journal entries
 */
export function createReactionService(
  db: DatabaseType,
  config: Partial<ReactionConfig> = {},
  llmService?: LLMServiceInterface,
): ReactionServiceInterface {
  const repository = createReactionRepository(db);
  let currentConfig: ReactionConfig = { ...DEFAULT_CONFIG, ...config };
  const listeners: Map<
    ReactionEventType,
    Set<ReactionEventCallback<ReactionEventType>>
  > = new Map();

  const emit = <K extends ReactionEventType>(event: K, data: ReactionEvents[K]): void => {
    const callbacks = listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  };

  const on = <K extends ReactionEventType>(
    event: K,
    callback: ReactionEventCallback<K>,
  ): (() => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(callback as ReactionEventCallback<ReactionEventType>);

    return () => {
      listeners.get(event)?.delete(callback as ReactionEventCallback<ReactionEventType>);
    };
  };

  const isEnabled = (): boolean => {
    return currentConfig.enabled;
  };

  const generateReaction = async (entryId: string, content: string): Promise<Reaction | null> => {
    if (!currentConfig.enabled) {
      return null;
    }

    let reactionContent: string;
    let reactionType: ReactionType = currentConfig.defaultReactionType;

    if (currentConfig.useLLM && llmService) {
      try {
        const response = await llmService.react(content);
        const trimmed = response.content.trim();
        // Use LLM response if non-empty, otherwise fallback
        if (trimmed) {
          reactionContent = trimmed;
          reactionType = 'custom';
        } else {
          reactionContent = getDefaultContent(reactionType);
        }
      } catch {
        // Fallback to default reaction on LLM failure
        reactionContent = getDefaultContent(reactionType);
      }
    } else {
      reactionContent = getDefaultContent(reactionType);
    }

    const reaction: Reaction = {
      id: generateEntryId(),
      entryId,
      reactionType,
      content: reactionContent,
      createdAt: new Date(),
    };

    repository.insert(reaction);
    emit('reactionCreated', reaction);
    return reaction;
  };

  const queueReaction = (entryId: string, content: string): void => {
    if (!currentConfig.enabled) {
      return;
    }
    // Fire and forget - don't await
    generateReaction(entryId, content).catch(() => {
      // Silently fail - reactions are non-critical
    });
  };

  const getReaction = (entryId: string): Reaction | null => {
    return repository.findByEntryId(entryId);
  };

  const getReactionsForEntries = (entryIds: string[]): Map<string, Reaction> => {
    return repository.findByEntryIds(entryIds);
  };

  const deleteReaction = (entryId: string): boolean => {
    return repository.deleteByEntryId(entryId);
  };

  const updateConfig = (newConfig: Partial<ReactionConfig>): void => {
    currentConfig = { ...currentConfig, ...newConfig };
  };

  const getConfig = (): ReactionConfig => {
    return { ...currentConfig };
  };

  return {
    on,
    isEnabled,
    generateReaction,
    queueReaction,
    getReaction,
    getReactionsForEntries,
    deleteReaction,
    updateConfig,
    getConfig,
  };
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use createReactionService() instead
 */
export class ReactionService implements ReactionServiceInterface {
  private readonly _service: ReactionServiceInterface;

  constructor(
    db: DatabaseType,
    config: Partial<ReactionConfig> = {},
    llmService?: LLMServiceInterface,
  ) {
    this._service = createReactionService(db, config, llmService);
  }

  on<K extends ReactionEventType>(event: K, callback: ReactionEventCallback<K>) {
    return this._service.on(event, callback);
  }
  isEnabled() {
    return this._service.isEnabled();
  }
  generateReaction(entryId: string, content: string) {
    return this._service.generateReaction(entryId, content);
  }
  queueReaction(entryId: string, content: string) {
    return this._service.queueReaction(entryId, content);
  }
  getReaction(entryId: string) {
    return this._service.getReaction(entryId);
  }
  getReactionsForEntries(entryIds: string[]) {
    return this._service.getReactionsForEntries(entryIds);
  }
  deleteReaction(entryId: string) {
    return this._service.deleteReaction(entryId);
  }
  updateConfig(config: Partial<ReactionConfig>) {
    return this._service.updateConfig(config);
  }
  getConfig() {
    return this._service.getConfig();
  }
}
