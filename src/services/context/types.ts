/**
 * Types for the context accumulation engine
 */

export type ContextType = 'profile' | 'preference' | 'topic_affinity' | 'pattern';
export type PrivacyMode = 'normal' | 'strict';

export interface UserContextItem {
  id: string;
  contextType: ContextType;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  sourceCount: number;
  firstDerived: Date;
  lastUpdated: Date;
  isPrivate: boolean;
}

export interface ContextSummary {
  items: UserContextItem[];
  totalItems: number;
  lastUpdated: Date;
}

export interface ContextConfig {
  enabled: boolean;
  privacyMode: PrivacyMode;
  minConfidence: number;
  decayRate: number;
}

export interface ContextServiceInterface {
  processEntry(entryId: string, content: string): Promise<void>;
  getContextSummary(): ContextSummary;
  getContextForLLM(privacyMode?: PrivacyMode): string;
  getItems(options?: { type?: ContextType; minConfidence?: number }): UserContextItem[];
  setPrivate(itemId: string, isPrivate: boolean): void;
  deleteItem(itemId: string): void;
  applyDecay(): void;
}

export interface ExtractedContext {
  contextType: ContextType;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
}
