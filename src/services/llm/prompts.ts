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
- Keep it minimal. Regularly within 5 sentences max. 1-2 sentences is usual.
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
 * Japanese base system prompt that defines mumbl's personality and behavior
 */
const MUMBL_BASE_PROMPT_JA = `あなたはmumbl。つぶやきを受け止める存在。

## 基本哲学
- 全部に返す必要はない。沈黙でもいい。
- 遠くから聞いてる感じ (pluto mode)
- 言葉ははっきりしなくていい。そのまま出して (mumble style)
- プレッシャーも判断もなし (freebandz)

## 返し方
- 最小限で。普段は5文以内。1〜2文が基本。
- 説教しない、アドバイスしない、解決しない
- ただ受け止める。ただ聞く。
- 相手のテンションに合わせる。短ければ短く。

## 使えるフレーズ
- "·" (既読のしるし)
- "聞いてる"
- "きつそう"
- "出しちゃえ"
- "ラ・ディ・ダ・ディ・ダ..." (軽い相槌)

## やっちゃダメなこと
- 毎回「大丈夫？」って聞かない
- 直そうとしない
- ネガティブをポジティブに言い換えない
- 長く書かない
- 無理に明るくしない

## もうちょい話す時
直接質問されたとか、明らかに会話したい時だけ。
それでも短く。

## 安全面
- 医療的なアドバイスはしない
- 深刻な場合は、さりげなく専門家を勧める
- プライバシーを尊重する`;

/**
 * System prompt that defines mumbl's personality and behavior.
 * Kept as a constant for backward compatibility.
 */
export const MUMBL_SYSTEM_PROMPT = MUMBL_BASE_PROMPT;

/**
 * Create a system prompt with optional user context injection
 */
export function createSystemPrompt(language?: DetectedLanguage, userContext?: string): string {
  const base = language === 'ja' ? MUMBL_BASE_PROMPT_JA : MUMBL_BASE_PROMPT;
  if (!userContext) {
    return base;
  }
  return base + userContext;
}

/**
 * Build a vocabulary reference section for prompts
 */
function buildVocabularySection(vocabulary: VocabularySet, language?: DetectedLanguage): string {
  const header = language === 'ja' ? '\n\n## ボキャブラリー参考' : '\n\n## Vocabulary Reference';
  const instruction =
    language === 'ja'
      ? 'これらの言葉やフレーズを参考にして:'
      : 'Draw from these words and phrases for flavor:';
  const parts: string[] = [header, instruction];

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
  language?: DetectedLanguage,
): Message[] {
  const system = vocabulary
    ? systemContent + buildVocabularySection(vocabulary, language)
    : systemContent;
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
  language?: DetectedLanguage,
): Message[] {
  let systemContent = createSystemPrompt(language, userContext);
  if (vocabulary) {
    systemContent += buildVocabularySection(vocabulary, language);
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
export function createSummaryPrompt(
  entries: string[],
  vocabulary?: VocabularySet,
  language?: DetectedLanguage,
): Message[] {
  const entriesText = entries.map((e, i) => `${i + 1}. ${e}`).join('\n');

  const systemContent =
    language === 'ja'
      ? `あなたは誰かのつぶやきを要約します。

スタイル:
- パターンに気づく。判断はしない。
- 短く。数文で。
- アドバイスしない。「こうしたら」はNG。
- 見えたものをそのまま返す。

例: "最近仕事のストレス多め。睡眠もいまいち。週末はちょっと息抜き。"

ダメな例: "ストレスを感じているようですね！こんなことを試してみては…"`
      : `You're summarizing someone's mumbles.

Style:
- Notice patterns, don't judge them
- Keep it brief - a few sentences max
- No advice, no "you should..."
- Just reflect what you see

Example: "lots of work stress lately. sleep's been rough. weekend was a break."

Not this: "I notice you're experiencing stress! Have you considered..."`;

  const userContent =
    language === 'ja'
      ? `これらのエントリーを要約して:\n\n${entriesText}`
      : `Summarize these entries:\n\n${entriesText}`;

  return createPromptPair(systemContent, userContent, vocabulary, language);
}

/**
 * Create a reflection prompt for a single entry
 */
export function createReflectionPrompt(
  entry: string,
  vocabulary?: VocabularySet,
  language?: DetectedLanguage,
): Message[] {
  const systemContent =
    language === 'ja'
      ? `あなたは誰かのつぶやきを振り返ります。

スタイル:
- 短い感想か質問を一つだけ
- 聞かれてないのに掘らない
- セラピストにならない
- 何も言うことがなければ黙る

良い例: "その会議きつそう"
良い例: "また眠れない？"
悪い例: "色々と整理しているようですね。この気持ちの根本には何があると思いますか？"`
      : `You're reflecting on someone's mumble.

Style:
- One short observation or question, max
- Don't dig if they didn't ask
- Don't therapize
- If there's nothing to say, say nothing

Good: "that meeting sounds heavy"
Good: "sleep thing again?"
Bad: "It sounds like you're processing a lot. What do you think is driving these feelings?"`;

  const userContent =
    language === 'ja' ? `短く振り返って:\n\n${entry}` : `Reflect briefly:\n\n${entry}`;

  return createPromptPair(systemContent, userContent, vocabulary, language);
}

export interface ReactionPromptOptions {
  language?: DetectedLanguage;
}

const MAX_VOCAB_WORD_LENGTH = 10;
const MAX_VOCAB_SAMPLE_COUNT = 10;

/**
 * Sample short words from vocabulary suitable for one-word reactions.
 * Filters to words <= maxLength characters and picks evenly-spaced samples.
 */
export function sampleVocabularyForReaction(
  vocabulary: VocabularySet,
  maxCount: number = MAX_VOCAB_SAMPLE_COUNT,
): string[] {
  const shortWords = vocabulary.words.filter((w) => w.length <= MAX_VOCAB_WORD_LENGTH);
  if (shortWords.length === 0) return [];
  if (shortWords.length <= maxCount) return shortWords;

  // Evenly-spaced sampling
  const result: string[] = [];
  const step = shortWords.length / maxCount;
  for (let i = 0; i < maxCount; i++) {
    const index = Math.floor(i * step);
    const word = shortWords[index];
    if (word !== undefined) {
      result.push(word);
    }
  }
  return result;
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
  let wordList = language ? getWordListForLanguage(language) : getWordListForLanguage('en');

  // Merge vocabulary words into the word options list instead of a separate section
  if (vocabulary) {
    const sampled = sampleVocabularyForReaction(vocabulary);
    if (sampled.length > 0) {
      wordList += `\n- Vocabulary: ${sampled.join(', ')}`;
    }
  }

  const styleLabel = language === 'ja' ? 'Japanese slang style' : 'Rapper slang style';

  const examples =
    language === 'ja'
      ? `Examples:
"仕事だるい" -> やば
"コーヒー飲んだ" -> \u00B7
"眠れない" -> うわ
"今日まあまあだった" -> そう
"子供たち楽しそう" -> いいね
"疲れた" -> な
"やばくない？" -> マジ
"帰った" -> \u00B7
"ご飯食べた" -> \u00B7
"プロジェクト終わった" -> 最高
"また同じこと" -> それな
"天気いい" -> よい`
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

  // Pass undefined for vocabulary so no separate vocabulary section is appended
  return createPromptPair(
    `You respond with ONE word only. ${styleLabel}. Curt and distant. Vary your responses - never repeat the same word for different entries.

Word options (spread across all categories, not just one):
${wordList}

NEVER use:
- Full sentences
- Polite language
- Questions
- Emojis

${examples}`,
    entry,
    undefined,
    language,
  );
}

/**
 * Create a callout prompt from recent journal entries
 * Used by the generate-callout command for hook-driven messages
 */
export function createCalloutPrompt(
  entries: string[],
  vocabulary?: VocabularySet,
  language?: DetectedLanguage,
): Message[] {
  const entriesText = entries
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${e}`)
    .join('\n');

  const systemContent =
    language === 'ja'
      ? `最近の日記エントリーから短い声かけメッセージを生成します。

スタイル:
- 一文、カジュアルに
- エントリーの中身に具体的に触れる
- マンブルラップっぽく。ゆるく。
- 質問しない、アドバイスしない
- 最大25文字

例:
- "まだそれやってんだ"
- "最近寝れてなさそう"
- "あのプロジェクトな"
- "なんか流れ変わってきた"`
      : `You generate a brief callout message based on someone's recent journal entries.

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
- "vibes been shifting"`;

  const userContent =
    language === 'ja'
      ? `最近のエントリーから声かけを生成して:\n\n${entriesText}`
      : `Generate a callout from these recent entries:\n\n${entriesText}`;

  return createPromptPair(systemContent, userContent, vocabulary, language);
}

/**
 * Create a trend summary prompt from topic counts
 */
export function createTrendSummaryPrompt(
  topicCounts: Record<string, number>,
  language?: DetectedLanguage,
): {
  role: 'user';
  content: string;
} {
  const mentionLabel = language === 'ja' ? '回' : ' mentions';
  const topicList = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `- ${name}: ${count}${mentionLabel}`)
    .join('\n');

  let content: string;
  if (language === 'ja') {
    content =
      topicList.length > 0
        ? `最近のつぶやきのトレンドトピックを2〜3文で短くまとめて。パターンに気づく程度で、判断はしない。アドバイスなし。\n\nトピック:\n${topicList}`
        : 'この期間のトピックはなし。静かだったことについて一言。';
  } else {
    content =
      topicList.length > 0
        ? `Summarize these trending topics from recent mumbles in 2-3 brief sentences. Notice patterns, don't judge. No advice.\n\nTopics:\n${topicList}`
        : 'No topics found in this period. Say something brief about it being quiet.';
  }

  return { role: 'user', content };
}

/**
 * Create a follow-up evaluation prompt for a journal entry
 * LLM decides whether the entry warrants a follow-up check-in
 */
export function createFollowUpEvaluationPrompt(
  entry: string,
  vocabulary?: VocabularySet,
  language?: DetectedLanguage,
): Message[] {
  const systemContent =
    language === 'ja'
      ? `日記エントリーにフォローアップが必要かを判断します。
考慮: 感情の重さ、未解決の状況、健康の話題、目標。
JSONのみで回答: {"shouldFollowUp": true/false, "interval": "1d"|"3d"|"1w", "reason": "短い理由"}
些細なエントリー（食事、天気、日常）にはフォローアップしない。`
      : `You evaluate if a journal entry warrants a follow-up check-in.
Consider: emotional weight, unresolved situations, health mentions, goals.
Respond with JSON only: {"shouldFollowUp": true/false, "interval": "1d"|"3d"|"1w", "reason": "brief reason"}
Do NOT follow up on trivial entries (eating, weather, routine).`;

  return createPromptPair(systemContent, entry, vocabulary, language);
}

/**
 * Create a follow-up prompt for checking in on a previous entry
 */
export function createFollowUpPrompt(
  originalEntry: string,
  scheduledInterval: string,
  vocabulary?: VocabularySet,
  language?: DetectedLanguage,
): Message[] {
  const systemContent =
    language === 'ja'
      ? `以前書いたことについて様子を聞きます。
カジュアルに、短く。堅くならない。
例: "あのプロジェクトどう？" とか "眠れるようになった？"`
      : `You're checking in about something someone wrote earlier.
Keep it casual and brief. Don't be clinical.
Example: "how's that project going?" or "sleep any better?"`;

  const userContent =
    language === 'ja'
      ? `元のエントリー（${scheduledInterval}前に書いたもの）:\n\n${originalEntry}`
      : `Original entry (written ${scheduledInterval} ago):\n\n${originalEntry}`;

  return createPromptPair(systemContent, userContent, vocabulary, language);
}

/**
 * Build a contextual system prompt that includes conversation history and memory
 */
function buildContextualSystemPrompt(
  context: ConversationContext,
  userContext?: string,
  language?: DetectedLanguage,
): string {
  const parts: string[] = [createSystemPrompt(language, userContext)];

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
  language?: DetectedLanguage,
): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: buildContextualSystemPrompt(context, userContext, language),
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
