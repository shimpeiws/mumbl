import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ConversationMemoryRow } from '../../repositories/types.js';
import { toUnixSeconds } from '../../utils/date.js';
import type { LLMServiceInterface } from '../llm/llm-service.js';
import type { ConversationMemory } from './types.js';

/**
 * Default token limit for context window
 */
export const DEFAULT_CONTEXT_WINDOW = 4000;

/**
 * Token threshold that triggers summarization
 */
export const SUMMARIZATION_THRESHOLD = 3000;

/**
 * Unicode ranges for CJK characters
 */
function isCJK(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
    (code >= 0xff00 && code <= 0xffef) // Fullwidth Forms
  );
}

/**
 * Estimate token count for a given text.
 * Uses heuristic: ~4 chars/token for ASCII, ~2 chars/token for CJK
 */
export function estimateTokens(text: string): number {
  let asciiCount = 0;
  let cjkCount = 0;

  for (const char of text) {
    if (isCJK(char)) {
      cjkCount++;
    } else {
      asciiCount++;
    }
  }

  return Math.ceil(asciiCount / 4) + Math.ceil(cjkCount / 2);
}

/**
 * Convert database row to ConversationMemory
 */
function rowToMemory(row: ConversationMemoryRow): ConversationMemory {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    memoryType: row.memory_type as 'buffer' | 'summary' | 'context',
    content: JSON.parse(row.content),
    tokenCount: row.token_count,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

/**
 * Memory manager interface
 */
export interface MemoryManagerInterface {
  getMemories(conversationId: string): ConversationMemory[];
  updateBuffer(conversationId: string, newContent: string): void;
  shouldSummarize(conversationId: string): boolean;
  summarizeOldest(conversationId: string): Promise<void>;
}

/**
 * Create a memory manager for conversation memory
 */
export function createMemoryManager(
  db: Database.Database,
  llmService: LLMServiceInterface,
): MemoryManagerInterface {
  const getMemories = (conversationId: string): ConversationMemory[] => {
    const stmt = db.prepare(`
      SELECT id, conversation_id, memory_type, content, token_count, created_at, updated_at
      FROM conversation_memory
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(conversationId) as ConversationMemoryRow[];
    return rows.map(rowToMemory);
  };

  const updateBuffer = (conversationId: string, newContent: string): void => {
    const now = new Date();
    const tokenCount = estimateTokens(newContent);

    // Check for existing buffer
    const existingStmt = db.prepare(`
      SELECT id, content, token_count
      FROM conversation_memory
      WHERE conversation_id = ? AND memory_type = 'buffer'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const existing = existingStmt.get(conversationId) as
      | { id: string; content: string; token_count: number }
      | undefined;

    if (existing) {
      const existingContent = JSON.parse(existing.content) as { entries: string[] };
      existingContent.entries.push(newContent);
      const updatedTokenCount = existing.token_count + tokenCount;

      const updateStmt = db.prepare(`
        UPDATE conversation_memory
        SET content = ?, token_count = ?, updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(
        JSON.stringify(existingContent),
        updatedTokenCount,
        toUnixSeconds(now),
        existing.id,
      );
    } else {
      const id = randomUUID();
      const content = JSON.stringify({ entries: [newContent] });

      const insertStmt = db.prepare(`
        INSERT INTO conversation_memory
          (id, conversation_id, memory_type, content, token_count, created_at, updated_at)
        VALUES (?, ?, 'buffer', ?, ?, ?, ?)
      `);

      insertStmt.run(
        id,
        conversationId,
        content,
        tokenCount,
        toUnixSeconds(now),
        toUnixSeconds(now),
      );
    }
  };

  const shouldSummarize = (conversationId: string): boolean => {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(token_count), 0) as total_tokens
      FROM conversation_memory
      WHERE conversation_id = ? AND memory_type = 'buffer'
    `);

    const row = stmt.get(conversationId) as { total_tokens: number };
    return row.total_tokens >= SUMMARIZATION_THRESHOLD;
  };

  const summarizeOldest = async (conversationId: string): Promise<void> => {
    const bufferStmt = db.prepare(`
      SELECT id, content, token_count
      FROM conversation_memory
      WHERE conversation_id = ? AND memory_type = 'buffer'
      ORDER BY created_at ASC
      LIMIT 1
    `);

    const buffer = bufferStmt.get(conversationId) as
      | { id: string; content: string; token_count: number }
      | undefined;

    if (!buffer) return;

    const bufferContent = JSON.parse(buffer.content) as { entries: string[] };
    const entries = bufferContent.entries;

    if (entries.length === 0) return;

    // Summarize the older half of entries
    const splitPoint = Math.ceil(entries.length / 2);
    const toSummarize = entries.slice(0, splitPoint);
    const toKeep = entries.slice(splitPoint);

    const response = await llmService.summarize(toSummarize);

    const now = new Date();
    const summaryId = randomUUID();
    const summaryContent = JSON.stringify({ summary: response.content });
    const summaryTokens = estimateTokens(response.content);

    // Insert summary
    const insertStmt = db.prepare(`
      INSERT INTO conversation_memory
        (id, conversation_id, memory_type, content, token_count, created_at, updated_at)
      VALUES (?, ?, 'summary', ?, ?, ?, ?)
    `);

    insertStmt.run(
      summaryId,
      conversationId,
      summaryContent,
      summaryTokens,
      toUnixSeconds(now),
      toUnixSeconds(now),
    );

    // Update the buffer with remaining entries
    if (toKeep.length > 0) {
      const keptContent = JSON.stringify({ entries: toKeep });
      const keptTokens = toKeep.reduce((sum, e) => sum + estimateTokens(e), 0);

      const updateStmt = db.prepare(`
        UPDATE conversation_memory
        SET content = ?, token_count = ?, updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(keptContent, keptTokens, toUnixSeconds(now), buffer.id);
    } else {
      const deleteStmt = db.prepare('DELETE FROM conversation_memory WHERE id = ?');
      deleteStmt.run(buffer.id);
    }
  };

  return {
    getMemories,
    updateBuffer,
    shouldSummarize,
    summarizeOldest,
  };
}
