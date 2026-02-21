/**
 * Extract user context from journal entries using LLM
 */
import type { LLMServiceInterface } from '../llm/llm-service.js';
import type { ExtractedContext } from './types.js';

const VALID_CONTEXT_TYPES = new Set(['profile', 'preference', 'topic_affinity', 'pattern']);

/**
 * Extract context items from a journal entry using LLM analysis
 */
export async function extractContextFromEntry(
  content: string,
  llmService: LLMServiceInterface,
): Promise<ExtractedContext[]> {
  const prompt = `Extract user context from this journal entry.
Return a JSON array of observations about the user.
Each observation should have:
- contextType: one of "preference", "pattern", "profile", "topic_affinity"
- key: a short snake_case key (e.g., "favorite_drink", "work_schedule")
- value: an object with a "description" field explaining the observation
- confidence: a number between 0.1 and 1.0

Only extract clear, explicit information. Do not speculate.
Return empty array [] if nothing meaningful can be extracted.
Return ONLY valid JSON, no markdown or explanation.

Entry:
${content}`;

  try {
    const response = await llmService.chat(prompt, {
      includeHistory: false,
    });

    return parseExtractionResponse(response.content);
  } catch {
    return [];
  }
}

/**
 * Parse the LLM response into structured context items
 */
export function parseExtractionResponse(response: string): ExtractedContext[] {
  try {
    // Try to find JSON array in the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const results: ExtractedContext[] = [];

    for (const item of parsed) {
      if (
        typeof item !== 'object' ||
        item === null ||
        !('contextType' in item) ||
        !('key' in item) ||
        !('value' in item) ||
        !('confidence' in item)
      ) {
        continue;
      }

      const record = item as Record<string, unknown>;
      const contextType = String(record['contextType']);
      const key = String(record['key']);
      const confidence = Number(record['confidence']);

      if (!VALID_CONTEXT_TYPES.has(contextType)) {
        continue;
      }

      if (!key || key.length === 0) {
        continue;
      }

      if (Number.isNaN(confidence) || confidence < 0.1 || confidence > 1.0) {
        continue;
      }

      const rawValue = record['value'];
      const value =
        typeof rawValue === 'object' && rawValue !== null
          ? (rawValue as Record<string, unknown>)
          : { description: String(rawValue) };

      results.push({
        contextType: contextType as ExtractedContext['contextType'],
        key,
        value,
        confidence,
      });
    }

    return results;
  } catch {
    return [];
  }
}
