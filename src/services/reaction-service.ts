import type { Database as DatabaseType } from 'better-sqlite3';
import { createReactionRepository } from '../repositories/reaction-repository.js';
import type { Reaction, ReactionType } from '../repositories/types.js';
import { generateEntryId } from './id-service.js';
import { detectLanguage } from './language/detect.js';
import type { DetectedLanguage } from './language/types.js';
import type { LLMServiceInterface } from './llm/llm-service.js';
import type { VocabularySet } from './wordgrain/types.js';

export interface ReactionConfig {
  enabled: boolean;
  defaultReactionType: ReactionType;
  useLLM: boolean;
  language?: 'auto' | 'ja' | 'en';
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
  setVocabulary(vocabulary: VocabularySet): void;
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
  let vocabulary: VocabularySet | undefined;

  const setVocabulary = (v: VocabularySet): void => {
    vocabulary = v;
  };

  const getVocabularyFallback = (): string | undefined => {
    if (!vocabulary || vocabulary.words.length === 0) return undefined;
    const index = Math.floor(Math.random() * vocabulary.words.length);
    return vocabulary.words[index];
  };

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

  const resolveLanguage = (content: string): DetectedLanguage | undefined => {
    const mode = currentConfig.language;
    if (!mode || mode === 'auto') {
      return detectLanguage(content);
    }
    return mode;
  };

  const generateReaction = async (entryId: string, content: string): Promise<Reaction | null> => {
    if (!currentConfig.enabled) {
      return null;
    }

    let reactionContent: string;
    let reactionType: ReactionType = currentConfig.defaultReactionType;

    if (currentConfig.useLLM && llmService) {
      try {
        const language = resolveLanguage(content);
        const response = await llmService.react(content, { language });
        const trimmed = response.content.trim();
        // Use LLM response if non-empty, otherwise fallback
        if (trimmed) {
          reactionContent = trimmed;
          reactionType = 'custom';
        } else {
          reactionContent = getDefaultContent(reactionType);
        }
      } catch {
        // Fallback: vocabulary word if available, otherwise default
        reactionContent = getVocabularyFallback() ?? getDefaultContent(reactionType);
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
    setVocabulary,
  };
}
