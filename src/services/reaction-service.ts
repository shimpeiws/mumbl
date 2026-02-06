import type { Database as DatabaseType } from 'better-sqlite3';
import { ReactionRepository } from '../repositories/reaction-repository.js';
import type { Reaction, ReactionType } from '../repositories/types.js';
import { generateEntryId } from './id-service.js';
import type { LLMService } from './llm/llm-service.js';

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
 * Service for managing reactions to journal entries
 */
export class ReactionService {
  private repository: ReactionRepository;
  private config: ReactionConfig;
  private llmService?: LLMService;
  private listeners: Map<ReactionEventType, Set<ReactionEventCallback<ReactionEventType>>> =
    new Map();

  constructor(db: DatabaseType, config: Partial<ReactionConfig> = {}, llmService?: LLMService) {
    this.repository = new ReactionRepository(db);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmService = llmService;
  }

  /**
   * Subscribe to reaction events
   * Returns an unsubscribe function
   */
  on<K extends ReactionEventType>(event: K, callback: ReactionEventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback as ReactionEventCallback<ReactionEventType>);

    return () => {
      this.listeners.get(event)?.delete(callback as ReactionEventCallback<ReactionEventType>);
    };
  }

  private emit<K extends ReactionEventType>(event: K, data: ReactionEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  /**
   * Check if reactions are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Generate a reaction for an entry (async)
   * Returns a Promise that resolves when the reaction is created
   */
  async generateReaction(entryId: string, content: string): Promise<Reaction | null> {
    if (!this.config.enabled) {
      return null;
    }

    let reactionContent: string;
    let reactionType: ReactionType = this.config.defaultReactionType;

    if (this.config.useLLM && this.llmService) {
      try {
        const response = await this.llmService.react(content);
        const trimmed = response.content.trim();
        // Use LLM response if non-empty, otherwise fallback
        if (trimmed) {
          reactionContent = trimmed;
          reactionType = 'custom';
        } else {
          reactionContent = this.getDefaultContent(reactionType);
        }
      } catch {
        // Fallback to default reaction on LLM failure
        reactionContent = this.getDefaultContent(reactionType);
      }
    } else {
      reactionContent = this.getDefaultContent(reactionType);
    }

    const reaction: Reaction = {
      id: generateEntryId(),
      entryId,
      reactionType,
      content: reactionContent,
      createdAt: new Date(),
    };

    this.repository.insert(reaction);
    this.emit('reactionCreated', reaction);
    return reaction;
  }

  /**
   * Queue a reaction generation (fire-and-forget)
   * This is the primary method for non-blocking reaction generation
   */
  queueReaction(entryId: string, content: string): void {
    if (!this.config.enabled) {
      return;
    }
    // Fire and forget - don't await
    this.generateReaction(entryId, content).catch(() => {
      // Silently fail - reactions are non-critical
    });
  }

  /**
   * Get reaction for an entry
   */
  getReaction(entryId: string): Reaction | null {
    return this.repository.findByEntryId(entryId);
  }

  /**
   * Get reactions for multiple entries (batch query for efficiency)
   */
  getReactionsForEntries(entryIds: string[]): Map<string, Reaction> {
    return this.repository.findByEntryIds(entryIds);
  }

  /**
   * Delete reaction for an entry
   */
  deleteReaction(entryId: string): boolean {
    return this.repository.deleteByEntryId(entryId);
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ReactionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReactionConfig {
    return { ...this.config };
  }

  private getDefaultContent(reactionType: ReactionType): string {
    const options = REACTION_CONTENT[reactionType];
    return options[0] ?? '·';
  }
}
