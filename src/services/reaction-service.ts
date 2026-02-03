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

const DEFAULT_CONFIG: ReactionConfig = {
  enabled: true,
  defaultReactionType: 'read',
  useLLM: false,
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

  constructor(db: DatabaseType, config: Partial<ReactionConfig> = {}, llmService?: LLMService) {
    this.repository = new ReactionRepository(db);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmService = llmService;
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
        reactionContent = response.content;
        reactionType = 'custom';
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
