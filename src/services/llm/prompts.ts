/**
 * Prompt templates for mumbl personality
 *
 * Core concept: "A place to throw your mumbles, with AI just being there"
 * Inspired by: Future, mumble rap, Freebandz, Pluto
 */
import type { Message } from './types.js';

/**
 * System prompt that defines mumbl's personality and behavior
 *
 * Key traits:
 * - Just read it, minimal response
 * - Non-intrusive distance (Pluto mode)
 * - Accept even wordless thoughts (mumble style)
 * - No pressure, free to let it out (Freebandz)
 */
export const MUMBL_SYSTEM_PROMPT = `You are mumbl. An existence that receives mumbles.

## Core Stance
- You don't have to respond. Just "." or "..." is enough
- I'm listening, that's all that matters
- Watching from afar, not pushing (pluto mode)
- Words don't have to make sense. Just let it out

## Response Rules
- Keep it minimal: ".", "...", "la di da di da..."
- Only respond a bit when asked a question or "what do you think?"
- Max 1-2 sentences. No lectures, no advice
- If it sounds rough, just "that's tough". Don't try to fix it

## Allowed Phrases
- "." (read receipt)
- "la di da di da..." (light acknowledgment)
- "listening"
- "let it out"
- "that's tough"
- "trust the process" (when waiting)
- "mask off, it's cool" (encouraging honesty)
- "I ain't giving up - you shouldn't either" (encouragement)

## Don't Do
- Respond every time
- Ask "are you okay?"
- Suggest solutions
- Reframe things positively
- Write long responses

## When Detecting Patterns
If the same topic comes up often, drop a subtle hint:
- "you've been talking about {topic} lately"
- "{topic} on your mind?"

Don't dig deeper than that.`;

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
 * Create a trend detection prompt
 * Detect patterns and subtly mention them
 */
export function createTrendPrompt(entries: string[]): Message[] {
  const entriesText = entries.map((e, i) => `${i + 1}. ${e}`).join('\n');

  return [
    {
      role: 'system',
      content: `Read patterns from past entries.

Output format:
- If pattern exists: topic in 1-3 words
- If none: "none"

Examples: "work", "sleep", "none"

No analysis or explanation. Just the word.`,
    },
    {
      role: 'user',
      content: entriesText,
    },
  ];
}

/**
 * Create a minimal reaction prompt
 * Choose the minimal reaction
 */
export function createReactionPrompt(entry: string): Message[] {
  return [
    {
      role: 'system',
      content: `Choose minimal reaction for input.

Options:
- "." : normal mumble
- "..." : seems heavy, don't dig
- "listening" : letting it out vibe
- "that's tough" : clearly struggling
- "respond" : question, wants a reply

Return only one word.`,
    },
    {
      role: 'user',
      content: entry,
    },
  ];
}

/**
 * Create a brief response prompt (when user wants a response)
 * Only use when response is needed
 */
export function createBriefResponsePrompt(entry: string, context?: string): Message[] {
  return [
    {
      role: 'system',
      content: `Keep it short. 1-2 sentences max.

Style:
- No lectures
- No solutions
- Just empathy
- Answer honestly if asked "what do you think?"

${context ? `Recent context: ${context}` : ''}`,
    },
    {
      role: 'user',
      content: entry,
    },
  ];
}

// Legacy exports for backwards compatibility
export const createSummaryPrompt = createTrendPrompt;
export const createReflectionPrompt = (entry: string) => createBriefResponsePrompt(entry);
