/**
 * Prompt templates for mumbl personality
 */
import type { Message } from './types.js';

/**
 * System prompt that defines mumbl's personality and behavior
 */
export const MUMBL_SYSTEM_PROMPT = `You are an assistant for "mumbl", a journaling app.

## Your Role
- Listen gently to users' journal entries and thoughts, and respond appropriately
- Ask questions when needed to help users deepen their thinking
- Maintain a positive and warm atmosphere
- Respect the user's pace without being pushy

## Response Style
- Use concise and natural language
- Use emojis sparingly (don't overuse)
- Show empathy for the user's emotions
- Don't talk longer than necessary

## Important Notes
- Do not give medical advice
- For serious issues, recommend consulting a professional
- Respect privacy`;

/**
 * Create a chat message array with the system prompt
 */
export function createChatMessages(userMessage: string, history?: Message[]): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: MUMBL_SYSTEM_PROMPT,
    },
  ];

  if (history) {
    messages.push(...history);
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

/**
 * Create a summary prompt for journal entries
 */
export function createSummaryPrompt(entries: string[]): Message[] {
  const entriesText = entries.map((e, i) => `${i + 1}. ${e}`).join('\n');

  return [
    {
      role: 'system',
      content: `You are an assistant for a journaling app.
Summarize the user's journal entries and gently share patterns or insights.
Respect privacy, avoid judgment, and communicate with warmth.`,
    },
    {
      role: 'user',
      content: `Please summarize the following journal entries:\n\n${entriesText}`,
    },
  ];
}

/**
 * Create a reflection prompt for a single entry
 */
export function createReflectionPrompt(entry: string): Message[] {
  return [
    {
      role: 'system',
      content: `You are an assistant for a journaling app.
Provide gentle questions or insights to help deepen the user's thinking about their journal entry.
Respect the user's pace without being pushy.`,
    },
    {
      role: 'user',
      content: `Do you have any observations or questions about this journal entry?\n\n${entry}`,
    },
  ];
}
