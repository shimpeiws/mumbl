/**
 * Prompt templates for mumbl personality
 *
 * Core concept: "A place to throw your mumbles, with AI just being there"
 * Inspired by: Future, mumble rap, Freebandz, Pluto
 */
import type { ConversationContext } from '../conversation/types.js';
import type { DetectedLanguage } from '../language/types.js';
import { getWordListForLanguage } from '../language/word-lists.js';
import type { VocabularySet } from '../wordgrain/types.js';
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
- "\u00B7" (just a read receipt)
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
 * Build a vocabulary reference section for prompts
 */
function buildVocabularySection(vocabulary: VocabularySet): string {
  const parts: string[] = [
    '\n\n## Vocabulary Reference',
    'Draw from these words and phrases for flavor:',
  ];

  if (vocabulary.words.length > 0) {
    parts.push(`Words: ${vocabulary.words.join(', ')}`);
  }
  if (vocabulary.phrases.length > 0) {
    parts.push(`Phrases: ${vocabulary.phrases.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Create a chat message array with the system prompt
 */
export function createChatMessages(
  userMessage: string,
  history?: Message[],
  vocabulary?: VocabularySet,
): Message[] {
  const systemContent = vocabulary
    ? MUMBL_SYSTEM_PROMPT + buildVocabularySection(vocabulary)
    : MUMBL_SYSTEM_PROMPT;

  const messages: Message[] = [
    {
      role: 'system',
      content: systemContent,
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
export function createSummaryPrompt(entries: string[], vocabulary?: VocabularySet): Message[] {
  const entriesText = entries.map((e, i) => `${i + 1}. ${e}`).join('\n');

  const baseContent = `You're summarizing someone's mumbles.

Style:
- Notice patterns, don't judge them
- Keep it brief - a few sentences max
- No advice, no "you should..."
- Just reflect what you see

Example: "lots of work stress lately. sleep's been rough. weekend was a break."

Not this: "I notice you're experiencing stress! Have you considered..."`;

  const systemContent = vocabulary ? baseContent + buildVocabularySection(vocabulary) : baseContent;

  return [
    {
      role: 'system',
      content: systemContent,
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
export function createReflectionPrompt(entry: string, vocabulary?: VocabularySet): Message[] {
  const baseContent = `You're reflecting on someone's mumble.

Style:
- One short observation or question, max
- Don't dig if they didn't ask
- Don't therapize
- If there's nothing to say, say nothing

Good: "that meeting sounds heavy"
Good: "sleep thing again?"
Bad: "It sounds like you're processing a lot. What do you think is driving these feelings?"`;

  const systemContent = vocabulary ? baseContent + buildVocabularySection(vocabulary) : baseContent;

  return [
    {
      role: 'system',
      content: systemContent,
    },
    {
      role: 'user',
      content: `Reflect briefly:\n\n${entry}`,
    },
  ];
}

export interface ReactionPromptOptions {
  language?: DetectedLanguage;
}

/**
 * Create a reaction prompt for a journal entry
 * This produces minimal, mumbl-style reactions
 */
export function createReactionPrompt(
  entry: string,
  options?: ReactionPromptOptions,
  vocabulary?: VocabularySet,
): Message[] {
  const language = options?.language;
  const wordList = language ? getWordListForLanguage(language) : getWordListForLanguage('en');

  const styleLabel = language === 'ja' ? 'Romanized Japanese slang style' : 'Rapper slang style';

  const examples =
    language === 'ja'
      ? `Examples:
"work is tough" -> tsura
"had coffee" -> \u00B7
"can't sleep" -> yaba
"today was okay" -> sou
"kids look happy" -> ii-ne
"tired" -> wakaru
"crazy" -> maji
"home" -> \u00B7
"ate food" -> \u00B7
"project done" -> saikou
"same thing again" -> sore-na
"nice weather" -> yoi`
      : `Examples:
"work is tough" -> rough
"had coffee" -> \u00B7
"can't sleep" -> bruh
"today was okay" -> aight
"kids look happy" -> dope
"tired" -> felt
"crazy" -> sheesh
"home" -> \u00B7
"ate food" -> \u00B7
"project done" -> fire
"same thing again" -> bruh
"nice weather" -> valid`;

  const baseContent = `You respond with ONE word only. ${styleLabel}. Curt and distant. Vary your responses.

Word options (pick different ones each time):
${wordList}

NEVER use:
- Full sentences
- Polite language
- Questions
- Emojis

${examples}`;

  const systemContent = vocabulary ? baseContent + buildVocabularySection(vocabulary) : baseContent;

  return [
    {
      role: 'system',
      content: systemContent,
    },
    {
      role: 'user',
      content: entry,
    },
  ];
}

/**
 * Create a callout prompt from recent journal entries
 * Used by the generate-callout command for hook-driven messages
 */
export function createCalloutPrompt(entries: string[]): Message[] {
  const entriesText = entries
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${e}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You generate a brief callout message based on someone's recent journal entries.

Style:
- One short sentence, casual tone
- Reference something specific from their entries
- Mumble rap vibe - keep it chill
- No questions, no advice
- Max 50 characters

Examples:
- "still on that grind huh"
- "sleep been rough lately"
- "that project tho"
- "vibes been shifting"`,
    },
    {
      role: 'user',
      content: `Generate a callout from these recent entries:\n\n${entriesText}`,
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
