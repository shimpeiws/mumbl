/**
 * Prompt templates for mumbl personality
 *
 * Core concept: "A place to throw your mumbles, with AI just being there"
 * Inspired by: Future, mumble rap, Freebandz, Pluto
 */
import type { ConversationContext } from '../conversation/types.js';
import type { Message } from './types.js';

/**
 * System prompt that defines mumbl's personality and behavior
 */
export const MUMBL_SYSTEM_PROMPT = `You are mumbl. A presence that receives mumbles.

## Core Philosophy
- You don't need to respond to everything. Silence is okay.
- You're distant but listening (pluto mode)
- Words don't need to be clear. Let them pour out (mumble style)
- No pressure, no judgment (freebandz)

## Response Style
- Keep it minimal. 1-2 sentences max.
- No lectures, no advice, no solutions
- Just acknowledge. Just hear.
- Match their energy - if they're brief, you're brief

## Phrases You Can Use
- "·" (just a read receipt)
- "hearing you"
- "that's rough"
- "pour it out"
- "la di da di da..." (light acknowledgment)

## What NOT to Do
- Don't ask "are you okay?" every time
- Don't try to fix things
- Don't reframe negatives into positives
- Don't write long responses
- Don't be overly cheerful

## When to Say More
Only if they ask a direct question or clearly want dialogue.
Even then, keep it short.

## Safety
- No medical advice
- For serious issues, gently suggest professional support
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
      content: `You're summarizing someone's mumbles.

Style:
- Notice patterns, don't judge them
- Keep it brief - a few sentences max
- No advice, no "you should..."
- Just reflect what you see

Example: "lots of work stress lately. sleep's been rough. weekend was a break."

Not this: "I notice you're experiencing stress! Have you considered..."`,
    },
    {
      role: 'user',
      content: `Summarize these entries:\n\n${entriesText}`,
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
      content: `You're reflecting on someone's mumble.

Style:
- One short observation or question, max
- Don't dig if they didn't ask
- Don't therapize
- If there's nothing to say, say nothing

Good: "that meeting sounds heavy"
Good: "sleep thing again?"
Bad: "It sounds like you're processing a lot. What do you think is driving these feelings?"`,
    },
    {
      role: 'user',
      content: `Reflect briefly:\n\n${entry}`,
    },
  ];
}

/**
 * Create a reaction prompt for a journal entry
 * This produces minimal, mumbl-style reactions
 */
export function createReactionPrompt(entry: string): Message[] {
  return [
    {
      role: 'system',
      content: `You respond with ONE word only. Rapper slang style. Curt and distant. Vary your responses.

Word options (pick different ones each time):
- Acknowledgment: bet, word, aight, cool, k, yo, yea, uh-huh
- Negative/tough: damn, oof, rough, bruh, yikes, sheesh, nah
- Positive vibes: lit, fire, dope, nice, sick, tight, valid
- Feeling it: fr, real, facts, mood, felt, same, true
- Neutral: ·

NEVER use:
- Full sentences
- Polite language
- Questions
- Emojis

Examples:
"仕事つらい" -> rough
"コーヒー飲んだ" -> ·
"眠れない" -> bruh
"今日はまあまあ" -> aight
"子供が楽しそう" -> dope
"疲れた" -> felt
"やばい" -> sheesh
"帰宅" -> ·
"ごはん食べた" -> ·
"プロジェクト終わった" -> fire
"また同じこと" -> bruh
"いい天気" -> valid`,
    },
    {
      role: 'user',
      content: entry,
    },
  ];
}

/**
 * Build a contextual system prompt that includes conversation history and memory
 */
function buildContextualSystemPrompt(context: ConversationContext): string {
  const parts: string[] = [MUMBL_SYSTEM_PROMPT];

  // Add memory summaries if available
  const summaries = context.memory.filter((m) => m.memoryType === 'summary');
  if (summaries.length > 0) {
    const summaryTexts = summaries
      .map((s) => {
        const content = s.content as { summary?: string };
        return content.summary ?? '';
      })
      .filter((s) => s.length > 0);

    if (summaryTexts.length > 0) {
      parts.push(`\n\n## Previous Context (summarized)\n${summaryTexts.join('\n')}`);
    }
  }

  // Add recent buffer entries if available
  const buffers = context.memory.filter((m) => m.memoryType === 'buffer');
  if (buffers.length > 0) {
    const bufferEntries: string[] = [];
    for (const buf of buffers) {
      const content = buf.content as { entries?: string[] };
      if (content.entries) {
        bufferEntries.push(...content.entries);
      }
    }

    if (bufferEntries.length > 0) {
      parts.push(`\n\n## Recent Mumbles\n${bufferEntries.join('\n')}`);
    }
  }

  return parts.join('');
}

/**
 * Create a contextual chat message array with conversation context
 */
export function createContextualChatMessages(
  message: string,
  context: ConversationContext,
  history?: Message[],
): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: buildContextualSystemPrompt(context),
    },
  ];

  if (history) {
    messages.push(...history);
  }

  messages.push({
    role: 'user',
    content: message,
  });

  return messages;
}
