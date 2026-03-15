import fs from 'node:fs';
import { resolveConfig } from '../config/index.js';
import { closeDatabase, getDatabase } from '../infrastructure/database/client.js';
import { createEntryRepository } from '../repositories/EntryRepository.js';
import { createProvider } from '../services/llm/LLMService.js';
import { createCalloutPrompt } from '../services/llm/prompts.js';
import { DEFAULT_OLLAMA_MODEL } from '../services/llm/types.js';
import { debugLog } from '../utils/log.js';

export const COOLDOWN_FILE = '/tmp/mumbl-callout-timestamp';
export const MESSAGE_FILE = '/tmp/mumbl-message';
export const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum number of recent entries to consider for callout generation */
const RECENT_ENTRIES_LIMIT = 20;

/**
 * Check if cooldown period has elapsed since last callout
 */
export function isCooldownActive(): boolean {
  try {
    if (!fs.existsSync(COOLDOWN_FILE)) {
      return false;
    }
    const timestamp = Number(fs.readFileSync(COOLDOWN_FILE, 'utf-8').trim());
    return Date.now() - timestamp < DEFAULT_COOLDOWN_MS;
  } catch (err) {
    debugLog('callout-cooldown', err);
    return false;
  }
}

/**
 * Generate a callout message from recent journal entries.
 * Designed to be called from Claude Code hooks (non-interactive).
 * All errors are caught silently to avoid disrupting the hook.
 */
export async function generateCallout(): Promise<void> {
  try {
    // Skip if message file already exists
    if (fs.existsSync(MESSAGE_FILE)) {
      return;
    }

    // Skip if cooldown is active
    if (isCooldownActive()) {
      return;
    }

    const db = getDatabase();
    const entryRepo = createEntryRepository(db);
    const entries = entryRepo.findAll({ limit: RECENT_ENTRIES_LIMIT, order: 'desc' });

    // No entries, nothing to generate
    if (entries.length === 0) {
      closeDatabase();
      return;
    }

    const entryTexts = entries.map((e) => e.content);
    const config = resolveConfig();
    const provider = createProvider({
      provider: config.provider,
      model: config.model ?? DEFAULT_OLLAMA_MODEL,
      baseUrl: config.baseUrl,
    });

    const messages = createCalloutPrompt(entryTexts);
    const response = await provider.chat(messages);

    // Write the callout message to the message file
    fs.writeFileSync(MESSAGE_FILE, response.content.trim(), 'utf-8');

    // Update cooldown timestamp
    fs.writeFileSync(COOLDOWN_FILE, String(Date.now()), 'utf-8');

    closeDatabase();
  } catch (err) {
    debugLog('callout-generate', err);
  }
}
