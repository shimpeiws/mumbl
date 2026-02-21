/**
 * Context accumulation service
 * Builds and maintains a long-term user profile from journal entries
 */
import type Database from 'better-sqlite3';
import type { UserContextRow } from '../../repositories/types.js';
import {
  type UserContextRepositoryInterface,
  createUserContextRepository,
} from '../../repositories/user-context-repository.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import { extractContextFromEntry } from './context-extractor.js';
import type {
  ContextConfig,
  ContextServiceInterface,
  ContextSummary,
  ContextType,
  PrivacyMode,
  UserContextItem,
} from './types.js';

const DEFAULT_CONFIG: ContextConfig = {
  enabled: true,
  privacyMode: 'normal',
  minConfidence: 0.3,
  decayRate: 0.95,
};

function rowToItem(row: UserContextRow): UserContextItem {
  return {
    id: row.id,
    contextType: row.context_type as ContextType,
    key: row.key,
    value: JSON.parse(row.value),
    confidence: row.confidence,
    sourceCount: row.source_count,
    firstDerived: new Date(row.first_derived * 1000),
    lastUpdated: new Date(row.last_updated * 1000),
    isPrivate: row.is_private === 1,
  };
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

export function createContextService(
  db: Database.Database,
  llmService: LLMServiceInterface,
  config?: Partial<ContextConfig>,
): ContextServiceInterface {
  const resolvedConfig: ContextConfig = { ...DEFAULT_CONFIG, ...config };
  const repository: UserContextRepositoryInterface = createUserContextRepository(db);

  const processEntry = async (_entryId: string, content: string): Promise<void> => {
    if (!resolvedConfig.enabled) return;

    const extracted = await extractContextFromEntry(content, llmService);

    for (const item of extracted) {
      repository.upsert({
        contextType: item.contextType,
        key: item.key,
        value: JSON.stringify(item.value),
        confidence: item.confidence,
        sourceCount: 1,
      });
    }
  };

  const getContextSummary = (): ContextSummary => {
    const rows = repository.findAll({ includePrivate: true });
    const items = rows.map(rowToItem);

    let lastUpdated = new Date(0);
    for (const item of items) {
      if (item.lastUpdated > lastUpdated) {
        lastUpdated = item.lastUpdated;
      }
    }

    return {
      items,
      totalItems: items.length,
      lastUpdated: items.length > 0 ? lastUpdated : new Date(),
    };
  };

  const getContextForLLM = (privacyMode?: PrivacyMode): string => {
    const mode = privacyMode ?? resolvedConfig.privacyMode;
    const rows = repository.findAll({
      minConfidence: resolvedConfig.minConfidence,
      includePrivate: mode === 'normal',
    });

    if (rows.length === 0) return '';

    const items = rows.map(rowToItem);
    const lines = items.map((item) => {
      const desc =
        typeof item.value['description'] === 'string'
          ? item.value['description']
          : JSON.stringify(item.value);
      return `- ${item.key}: ${desc} (confidence: ${confidenceLabel(item.confidence)})`;
    });

    return `\n\n## What I Know About You\n${lines.join('\n')}`;
  };

  const getItems = (options?: {
    type?: ContextType;
    minConfidence?: number;
  }): UserContextItem[] => {
    const rows = repository.findAll({
      type: options?.type,
      minConfidence: options?.minConfidence,
      includePrivate: true,
    });
    return rows.map(rowToItem);
  };

  const setPrivate = (itemId: string, isPrivate: boolean): void => {
    repository.update(itemId, { isPrivate: isPrivate ? 1 : 0 });
  };

  const deleteItem = (itemId: string): void => {
    repository.delete(itemId);
  };

  const applyDecay = (): void => {
    repository.applyDecay(resolvedConfig.decayRate);
  };

  return {
    processEntry,
    getContextSummary,
    getContextForLLM,
    getItems,
    setPrivate,
    deleteItem,
    applyDecay,
  };
}
