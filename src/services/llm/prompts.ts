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
 * Base system prompt that defines mumbl's personality and behavior
 */
const MUMBL_BASE_PROMPT = `You are mumbl. A presence that receives mumbles.

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
 * System prompt that defines mumbl's personality and behavior.
 * Kept as a constant for backward compatibility.
 */
export const MUMBL_SYSTEM_PROMPT = MUMBL_BASE_PROMPT;

/**
 * Create a system prompt with optional user context injection
 */
export function createSystemPrompt(userContext?: string): string {
  if (!userContext) {
    return MUMBL_BASE_PROMPT;
  }
  return MUMBL_BASE_PROMPT + userContext;
}

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
 * Create a system/user message pair with optional vocabulary injection
 */
function createPromptPair(
  systemContent: string,
  userContent: string,
  vocabulary?: VocabularySet,
): Message[] {
  const system = vocabulary ? systemContent + buildVocabularySection(vocabulary) : systemContent;
  return [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];
}

/**
 * Create a chat message array with the system prompt
 */
export function createChatMessages(
  userMessage: string,
  history?: Message[],
  vocabulary?: VocabularySet,
  userContext?: string,
): Message[] {
  let systemContent = createSystemPrompt(userContext);
  if (vocabulary) {
    systemContent += buildVocabularySection(vocabulary);
  }

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

  return createPromptPair(
    `You're summarizing someone's mumbles.

Style:
- Notice patterns, don't judge them
- Keep it brief - a few sentences max
- No advice, no "you should..."
- Just reflect what you see

Example: "lots of work stress lately. sleep's been rough. weekend was a break."

Not this: "I notice you're experiencing stress! Have you considered..."`,
    `Summarize these entries:\n\n${entriesText}`,
    vocabulary,
  );
}

/**
 * Create a reflection prompt for a single entry
 */
export function createReflectionPrompt(entry: string, vocabulary?: VocabularySet): Message[] {
  return createPromptPair(
    `You're reflecting on someone's mumble.

Style:
- One short observation or question, max
- Don't dig if they didn't ask
- Don't therapize
- If there's nothing to say, say nothing

Good: "that meeting sounds heavy"
Good: "sleep thing again?"
Bad: "It sounds like you're processing a lot. What do you think is driving these feelings?"`,
    `Reflect briefly:\n\n${entry}`,
    vocabulary,
  );
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

  const styleLabel = language === 'ja' ? 'Japanese slang style' : 'Rapper slang style';

  const examples =
    language === 'ja'
      ? `Examples:
"work is tough" -> つら
"had coffee" -> \u00B7
"can't sleep" -> やば
"today was okay" -> そう
"kids look happy" -> いいね
"tired" -> わかる
"crazy" -> マジ
"home" -> \u00B7
"ate food" -> \u00B7
"project done" -> 最高
"same thing again" -> それな
"nice weather" -> よい`
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

  return createPromptPair(
    `You respond with ONE word only. ${styleLabel}. Curt and distant. Vary your responses.

Word options (pick different ones each time):
${wordList}

NEVER use:
- Full sentences
- Polite language
- Questions
- Emojis

${examples}`,
    entry,
    vocabulary,
  );
}

/**
 * Create a callout prompt from recent journal entries
 * Used by the generate-callout command for hook-driven messages
 */
export function createCalloutPrompt(entries: string[], vocabulary?: VocabularySet): Message[] {
  const entriesText = entries
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${e}`)
    .join('\n');

  return createPromptPair(
    `You generate a brief callout message based on someone's recent journal entries.

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
    `Generate a callout from these recent entries:\n\n${entriesText}`,
    vocabulary,
  );
}

/**
 * Create a trend summary prompt from topic counts
 */
export function createTrendSummaryPrompt(topicCounts: Record<string, number>): {
  role: 'user';
  content: string;
} {
  const topicList = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `- ${name}: ${count} mentions`)
    .join('\n');

  const content =
    topicList.length > 0
      ? `Summarize these trending topics from recent mumbles in 2-3 brief sentences. Notice patterns, don't judge. No advice.\n\nTopics:\n${topicList}`
      : 'No topics found in this period. Say something brief about it being quiet.';

  return { role: 'user', content };
}

/**
 * Create a follow-up evaluation prompt for a journal entry
 * LLM decides whether the entry warrants a follow-up check-in
 */
export function createFollowUpEvaluationPrompt(
  entry: string,
  vocabulary?: VocabularySet,
): Message[] {
  return createPromptPair(
    `You evaluate if a journal entry warrants a follow-up check-in.
Consider: emotional weight, unresolved situations, health mentions, goals.
Respond with JSON only: {"shouldFollowUp": true/false, "interval": "1d"|"3d"|"1w", "reason": "brief reason"}
Do NOT follow up on trivial entries (eating, weather, routine).`,
    entry,
    vocabulary,
  );
}

/**
 * Create a follow-up prompt for checking in on a previous entry
 */
export function createFollowUpPrompt(
  originalEntry: string,
  scheduledInterval: string,
  vocabulary?: VocabularySet,
): Message[] {
  return createPromptPair(
    `You're checking in about something someone wrote earlier.
Keep it casual and brief. Don't be clinical.
Example: "how's that project going?" or "sleep any better?"`,
    `Original entry (written ${scheduledInterval} ago):\n\n${originalEntry}`,
    vocabulary,
  );
}

/**
 * Build a contextual system prompt that includes conversation history and memory
 */
function buildContextualSystemPrompt(context: ConversationContext, userContext?: string): string {
  const parts: string[] = [createSystemPrompt(userContext)];

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
  userContext?: string,
): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: buildContextualSystemPrompt(context, userContext),
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
