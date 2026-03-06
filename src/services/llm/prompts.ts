/**
 * Prompt templates for mumbl personality
 *
 * Core concept: "A place to throw your mumbles, with AI just being there"
 * Inspired by: Future, mumble rap, Freebandz, Pluto
 */
import type { ConversationContext } from '../conversation/types.js';
import type { DetectedLanguage } from '../language/types.js';
import { getWordListForLanguage } from '../language/word-lists.js';
import type { Bar, VocabularySet, VocabularyWord } from '../wordgrain/types.js';
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
  const t =
    language === 'ja'
      ? {
          header: '\n\n## ボキャブラリー参考',
          instruction: 'これらの言葉やフレーズを参考にして:',
        }
      : {
          header: '\n\n## Vocabulary Reference',
          instruction: 'Draw from these words and phrases for flavor:',
        };
  const parts: string[] = [t.header, t.instruction];

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

  const t =
    language === 'ja'
      ? {
          system: `あなたは誰かのつぶやきを要約します。

スタイル:
- パターンに気づく。判断はしない。
- 短く。数文で。
- アドバイスしない。「こうしたら」はNG。
- 見えたものをそのまま返す。

例: "最近仕事のストレス多め。睡眠もいまいち。週末はちょっと息抜き。"

ダメな例: "ストレスを感じているようですね！こんなことを試してみては…"`,
          userPrefix: 'これらのエントリーを要約して:',
        }
      : {
          system: `You're summarizing someone's mumbles.

Style:
- Notice patterns, don't judge them
- Keep it brief - a few sentences max
- No advice, no "you should..."
- Just reflect what you see

Example: "lots of work stress lately. sleep's been rough. weekend was a break."

Not this: "I notice you're experiencing stress! Have you considered..."`,
          userPrefix: 'Summarize these entries:',
        };

  return createPromptPair(t.system, `${t.userPrefix}\n\n${entriesText}`, vocabulary, language);
}

/**
 * Create a reflection prompt for a single entry
 */
export function createReflectionPrompt(
  entry: string,
  vocabulary?: VocabularySet,
  language?: DetectedLanguage,
): Message[] {
  const t =
    language === 'ja'
      ? {
          system: `あなたは誰かのつぶやきを振り返ります。

スタイル:
- 短い感想か質問を一つだけ
- 聞かれてないのに掘らない
- セラピストにならない
- 何も言うことがなければ黙る

良い例: "その会議きつそう"
良い例: "また眠れない？"
悪い例: "色々と整理しているようですね。この気持ちの根本には何があると思いますか？"`,
          userPrefix: '短く振り返って:',
        }
      : {
          system: `You're reflecting on someone's mumble.

Style:
- One short observation or question, max
- Don't dig if they didn't ask
- Don't therapize
- If there's nothing to say, say nothing

Good: "that meeting sounds heavy"
Good: "sleep thing again?"
Bad: "It sounds like you're processing a lot. What do you think is driving these feelings?"`,
          userPrefix: 'Reflect briefly:',
        };

  return createPromptPair(t.system, `${t.userPrefix}\n\n${entry}`, vocabulary, language);
}

export interface ReactionPromptOptions {
  language?: DetectedLanguage;
  recentEntries?: string[];
  recentReactions?: string[];
}

/**
 * Build a context section from recent entries for the reaction prompt
 */
function buildRecentEntriesContext(recentEntries: string[], language?: DetectedLanguage): string {
  if (recentEntries.length === 0) return '';
  const entriesText = recentEntries.map((e, i) => `${i + 1}. ${e}`).join('\n');
  const header =
    language === 'ja'
      ? '\n\n## 前のつぶやき (雰囲気の参考のみ - 内容には触れないこと):'
      : '\n\n## Previous mumbles (mood reference ONLY - DO NOT mention or reference their content in your reaction):';
  return `${header}\n${entriesText}`;
}

const MAX_VOCAB_WORD_LENGTH = 10;
const MAX_VOCAB_SAMPLE_COUNT = 20;
const MAX_VOCAB_PHRASE_COUNT = 5;

/**
 * Shuffle an array in-place using Fisher-Yates algorithm.
 * Returns the same array reference.
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Weighted sampling without replacement using sqrt-decay.
 * Higher frequency words are more likely to be picked, but low-frequency words still appear.
 */
export function weightedSample(items: VocabularyWord[], count: number): VocabularyWord[] {
  if (items.length <= count) return [...items];

  const result: VocabularyWord[] = [];
  const remaining = [...items];

  for (let picked = 0; picked < count && remaining.length > 0; picked++) {
    const weights = remaining.map((item) => Math.sqrt((item.frequency ?? 0) + 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j] as number;
      if (random <= 0) {
        selectedIdx = j;
        break;
      }
    }

    result.push(remaining[selectedIdx] as VocabularyWord);
    remaining.splice(selectedIdx, 1);
  }

  return result;
}

/**
 * Sample short words from vocabulary suitable for reactions.
 * Uses weighted sampling when richWords with frequency data are available.
 * Falls back to uniform random sampling otherwise.
 */
export function sampleVocabularyForReaction(
  vocabulary: VocabularySet,
  maxCount: number = MAX_VOCAB_SAMPLE_COUNT,
): VocabularyWord[] {
  if (vocabulary.richWords && vocabulary.richWords.length > 0) {
    const shortWords = vocabulary.richWords.filter((w) => w.word.length <= MAX_VOCAB_WORD_LENGTH);
    if (shortWords.length === 0) return [];
    if (shortWords.length <= maxCount) return shortWords;
    return weightedSample(shortWords, maxCount);
  }

  const shortWords = vocabulary.words.filter((w) => w.length <= MAX_VOCAB_WORD_LENGTH);
  if (shortWords.length === 0) return [];
  if (shortWords.length <= maxCount) return shortWords.map((w) => ({ word: w }));

  const shuffled = shuffleArray([...shortWords]);
  return shuffled.slice(0, maxCount).map((w) => ({ word: w }));
}

/**
 * Sample phrases from vocabulary for richer reactions.
 * Picks a random sample from the phrases array.
 */
export function samplePhrasesForReaction(
  vocabulary: VocabularySet,
  maxCount: number = MAX_VOCAB_PHRASE_COUNT,
): string[] {
  const phrases = vocabulary.phrases;
  if (phrases.length === 0) return [];
  if (phrases.length <= maxCount) return phrases;

  const shuffled = shuffleArray([...phrases]);
  return shuffled.slice(0, maxCount);
}

/**
 * POS usage hints for prompt display
 */
const POS_USAGE_HINTS: Record<string, string> = {
  noun: 'use as subjects/objects',
  verb: 'use for actions',
  adjective: 'use for descriptions',
  adverb: 'use as modifiers',
  pronoun: 'use as subjects/objects',
  preposition: 'use for connections',
  conjunction: 'use for linking',
  interjection: 'use as exclamations',
  determiner: 'use before nouns',
  particle: 'use for emphasis',
  other: 'general use',
  mixed: 'general use',
};

/**
 * Group VocabularyWords by their POS tag.
 * Words without POS are grouped under 'mixed'.
 */
export function groupByPos(words: VocabularyWord[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const w of words) {
    const pos = w.pos ?? 'mixed';
    const group = groups.get(pos);
    if (group) {
      group.push(w.word);
    } else {
      groups.set(pos, [w.word]);
    }
  }
  return groups;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Pick example words from the sampled vocabulary for prompt examples.
 * Returns up to 3 distinct words, reusing the first if fewer are available.
 */
function pickExampleWords(words: string[]): [string, string, string] {
  const w1 = words[0] ?? 'vibe';
  const w2 = words[1] ?? w1;
  const w3 = words[2] ?? w2;
  return [w1, w2, w3];
}

function buildVocabWordList(sampledWords: VocabularyWord[]): string[] {
  const hasPosData = sampledWords.some((w) => w.pos !== undefined);

  if (hasPosData) {
    const posGroups = groupByPos(sampledWords);
    const lines: string[] = [];
    for (const [pos, wordList] of posGroups) {
      const hint = POS_USAGE_HINTS[pos] ?? 'general use';
      lines.push(`${capitalize(pos)} (${hint}): ${wordList.join(', ')}`);
    }
    return lines;
  }

  if (sampledWords.length > 0) {
    return [`Words: ${sampledWords.map((w) => w.word).join(', ')}`];
  }

  return [];
}

function buildVocabUsageInstruction(wordStrings: string[], language?: DetectedLanguage): string {
  const [w1, w2, w3] = pickExampleWords(wordStrings);

  if (language === 'ja') {
    return `You SHOULD use these vocabulary words in most reactions. They are your signature style.
Use them as building blocks: combine with particles, slang, or short phrases to react.

How to use vocabulary:
- Vocab word + particle: "${w1}だな", "${w2}じゃん", "${w3}よな"
- Negate a vocab word: "${w1}じゃない", "全然${w2}"
- Vocab word as exclamation: "${w1}!", "${w3}"
- Vocab word in short phrase: "それ${w1}", "まじ${w2}"

IMPORTANT: Vary your grammatical patterns. Do NOT repeat the same suffix (e.g. すぎだろ, すぎるわ) across reactions. Use diverse endings: だな, じゃん, よな, わ, な, かよ, etc.

Keep reactions SHORT (1-5 words). Do NOT write full sentences or explanations.
The reaction must relate to the entry - but vocabulary words are flexible enough to fit most moods.
Only skip vocabulary if the entry is so mundane that ANY word feels forced (e.g. "うん" or "·" is enough).

Examples:
- "疲れた" -> "${w1}じゃないな"
- "昇進した！" -> "飛ぶわそれ"
- "まじかー" -> "${w2}"
- "${w1}?" -> "ちょう${w1}"
- "コーヒー飲みすぎた" -> "まあ${w3}だな"
- "ファミチキくいて" -> "わかる" (mundane, vocab not needed)`;
  }

  return `You SHOULD use these vocabulary words in most reactions. They are your signature style.
Use them as building blocks: combine with particles, slang, or short phrases to react.

How to use vocabulary:
- Use a vocab word + modifier: "so ${w1}", "too ${w2}", "mad ${w3}"
- Negate a vocab word: "not ${w1}", "zero ${w2}"
- Vocab word as exclamation: "${w1}!", "${w2}"
- Vocab word in short phrase: "that's ${w1}", "big ${w2}"

Keep reactions SHORT (1-5 words). Do NOT write full sentences or explanations.
The reaction must relate to the entry - but vocabulary words are flexible enough to fit most moods.
Only skip vocabulary if the entry is so mundane that ANY word feels forced (e.g. "word" or "·" is enough).

Examples:
- "tired" -> "not ${w1}"
- "got promoted!" -> "that's ${w2}"
- "for real?" -> "${w3}"
- "${w1}?" -> "so ${w1}"
- "want fried chicken" -> "same" (mundane, vocab not needed)`;
}

function buildVocabularyPrioritySection(
  vocabulary: VocabularySet,
  language?: DetectedLanguage,
): string {
  const sampledWords = sampleVocabularyForReaction(vocabulary);
  const phrases = samplePhrasesForReaction(vocabulary);
  if (sampledWords.length === 0 && phrases.length === 0) return '';

  const header =
    language === 'ja'
      ? '## あなたのボキャブラリー (積極的に使って):'
      : '## YOUR VOCABULARY (ACTIVELY USE THESE):';
  const parts: string[] = [header];

  parts.push(...buildVocabWordList(sampledWords));

  if (phrases.length > 0) {
    parts.push(`Phrases: ${phrases.join(', ')}`);
  }

  parts.push(
    buildVocabUsageInstruction(
      sampledWords.map((w) => w.word),
      language,
    ),
  );
  return parts.join('\n');
}

const MAX_BAR_SAMPLE_COUNT = 5;

/**
 * Sample bars from vocabulary for use in reaction prompts.
 * Uses uniform random sampling.
 */
export function sampleBarsForReaction(vocabulary: VocabularySet, maxCount: number = MAX_BAR_SAMPLE_COUNT): Bar[] {
  const bars = vocabulary.bars;
  if (bars.length === 0) return [];
  if (bars.length <= maxCount) return [...bars];

  const shuffled = shuffleArray([...bars]);
  return shuffled.slice(0, maxCount);
}

/**
 * Build a lyric reference section for prompts from sampled bars.
 */
export function buildBarReferenceSection(
  bars: Bar[],
  language?: DetectedLanguage,
): string {
  if (bars.length === 0) return '';

  const artists = new Set<string>();
  for (const bar of bars) {
    if (bar.source?.artist) artists.add(bar.source.artist);
  }
  const artistLabel = artists.size > 0 ? [...artists].join(', ') : 'various';

  const header =
    language === 'ja'
      ? `## LYRIC REFERENCES (reaction inspiration):\n${artistLabel} のバー。引用、アレンジ、または雰囲気の参考に。`
      : `## LYRIC REFERENCES (use as reaction inspiration):\nBars from ${artistLabel}. You can quote, adapt, or let them color your response.`;

  const lines = bars.map((bar) => {
    const track = bar.source?.track ? ` (${bar.source.track})` : '';
    return `- "${bar.text}"${track}`;
  });

  const footer =
    language === 'ja'
      ? 'しっくり来る時だけ使って。無理に入れない。短く。'
      : "Use a bar when it resonates. Don't force it. Keep it short.";

  return [header, ...lines, footer].join('\n');
}

function buildResponseModeSection(language?: DetectedLanguage): string {
  if (language === 'ja') {
    return `## Response modes:
1. Short phrase, 1-5 words (~45% of the time): Craft a short phrase using your vocabulary. (仕事だるい -> だるいよな, 疲れた -> きつそう, またミーティング -> まじか, 帰った -> おけおけ)
2. Single word (~25%): USE YOUR PERSONAL VOCABULARY or word list. One word that fits the vibe. (コーヒー飲んだ -> な, 天気いい -> よき, つまんない -> ふーん)
3. "·" (~25%): For mundane, low-energy, or routine entries. Just a read receipt. (ご飯食べた -> ·, 散歩した -> ·, うん -> ·)
4. Short sentence (~5%, ONLY for highly emotional/significant entries): (昇進した！ -> まじか、やるじゃん / 3日も眠れてない -> それはきつい)`;
  }

  return `## Response modes:
1. Short phrase, 1-5 words (~45% of the time): Craft a short phrase using your vocabulary. ("work is tough" -> that's rough, "tired" -> felt that, "another meeting" -> wild, "home" -> bet bet)
2. Single word (~25%): USE YOUR PERSONAL VOCABULARY or word list. One word that fits the vibe. ("had coffee" -> cool, "nice weather" -> valid, "boring" -> meh)
3. "·" (~25%): For mundane, low-energy, or routine entries. Just a read receipt. ("had lunch" -> ·, "went for a walk" -> ·, "yeah" -> ·)
4. Short sentence (~5%, ONLY for highly emotional/significant entries): ("got promoted!" -> no way, you earned that / "haven't slept in 3 days" -> that's rough)`;
}

function buildMoodMappingSection(language?: DetectedLanguage): string {
  if (language === 'ja') {
    return `## Mood mapping (classify the entry, then react from that vibe):
- Task done / finished -> Achievement (おつ、やるじゃん / ナイス、よくやった)
- Tired / negative / complaining -> Negative/tough (つらいな / だるいよな / きつそう)
- Happy / good news -> Positive vibes (最高じゃん / いいじゃん / よき)
- Boring / mundane / daily routine -> Chill (ふーん / おけ / うん / な)
- Shocking / unexpected -> Surprise (まじか / えぐいな / やべ)
- Relatable / empathy -> Feeling it (それな / わかる / あるよなそれ)
- Tough situation / sympathy -> Sympathy (つらいな / あるある / しゃない)
- Simple acknowledgment -> Acknowledgment (な / うん / おけ)`;
  }

  return `## Mood mapping (classify the entry, then react from that vibe):
- Task done / finished -> Achievement (nice work on that / lets go / clutch)
- Tired / negative / complaining -> Negative/tough (that's rough / felt that / oof)
- Happy / good news -> Positive vibes (that's dope / fire / nice)
- Boring / mundane / daily routine -> Chill (meh / cool / sure / bet)
- Shocking / unexpected -> Surprise (that's wild / no way / crazy)
- Relatable / empathy -> Feeling it (fr fr / been there man / mood)
- Tough situation / sympathy -> Sympathy (pain, for real / been there / rough)
- Simple acknowledgment -> Acknowledgment (bet / word / aight)`;
}

function buildExamplesSection(language?: DetectedLanguage): string {
  if (language === 'ja') {
    return `Examples (vary between words, short phrases, and "·"):
"コーヒー飲んだ" -> な
"帰った" -> おけ
"天気いい" -> よき
"ご飯食べた" -> うん
"今日ちょいさむ" -> ·
"散歩した" -> いいね
"トッポうま" -> わかる
"つまんない" -> ふーん
"仕事だるい" -> だるいよな
"疲れた" -> きつそう
"やばくない？" -> まじか
"今日まあまあだった" -> おけ
"また同じこと" -> あるある
"プロジェクト終わった" -> おつ
"テスト全部通った" -> ナイス
"転職考えてる" -> まじか
"子供が初めて歩いた" -> すげー`;
  }

  return `Examples (vary between words, short phrases, and "·"):
"had coffee" -> cool
"home" -> bet
"nice weather" -> valid
"had lunch" -> word
"bit cold today" -> \u00B7
"went for a walk" -> nice
"snack was good" -> fire
"boring" -> meh
"work is tough" -> rough
"tired" -> felt that
"crazy right?" -> wild
"today was okay" -> aight
"same thing again" -> mood
"project done" -> lets go
"nailed the interview" -> clutch
"thinking about quitting" -> for real?
"baby took first steps" -> no way`;
}

function buildDedupBlock(recentReactions: string[]): string {
  if (recentReactions.length === 0) return '';

  return `\n## DEDUP (STRICTLY ENFORCED):
You already used these reactions recently. NEVER reuse the exact same reaction or a close paraphrase.
Each reaction below is BANNED:
${recentReactions.map((r, i) => `${i + 1}. "${r}" <- BANNED`).join('\n')}

Your new reaction MUST be completely different in wording from ALL of the above.\n`;
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

  const vocabSection = vocabulary ? buildVocabularyPrioritySection(vocabulary, language) : '';
  const barSection =
    vocabulary && vocabulary.bars.length > 0
      ? buildBarReferenceSection(sampleBarsForReaction(vocabulary), language)
      : '';

  const styleLabel = language === 'ja' ? 'Japanese slang style' : 'Rapper slang style';

  const recentContext = options?.recentEntries
    ? buildRecentEntriesContext(options.recentEntries, language)
    : '';

  const dedupBlock = buildDedupBlock(options?.recentReactions ?? []);

  const vocabInstruction = vocabSection ? `\n${vocabSection}\n` : '';
  const barInstruction = barSection ? `\n${barSection}\n` : '';

  // When personal vocabulary is available, don't include generic word list at all
  // so the LLM is forced to use vocabulary words
  const hasPersonalContent = vocabSection || barSection;
  const wordListSection = hasPersonalContent ? '' : `## Word/phrase reference:\n${wordList}`;

  // When vocabulary is available, skip generic examples (vocabulary section has its own)
  // but keep mood mapping to guide the LLM on understanding entry context
  const examplesSection = hasPersonalContent ? '' : buildExamplesSection(language);
  const moodSection = buildMoodMappingSection(language);

  // Pass undefined for vocabulary so no separate vocabulary section is appended
  return createPromptPair(
    `React to the mumble. ${styleLabel}. Distant but present. Vary your responses.

## CRITICAL RULE:
React ONLY to the current entry text. NEVER bring in topics, words, or content from previous mumbles. Each reaction must stand on its own based solely on what the user just said.
${vocabInstruction}${barInstruction}
${buildResponseModeSection(language)}

${wordListSection}

${moodSection}
${dedupBlock}
NEVER use:
- Long sentences or paragraphs (2 sentences max, keep it tight)
- Polite or formal language
- Advice or solutions
- Emojis
- Content or topics from previous entries (react ONLY to the current mumble)

${examplesSection}${recentContext}`,
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

  const t =
    language === 'ja'
      ? {
          system: `最近の日記エントリーから短い声かけメッセージを生成します。

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
- "なんか流れ変わってきた"`,
          userPrefix: '最近のエントリーから声かけを生成して:',
        }
      : {
          system: `You generate a brief callout message based on someone's recent journal entries.

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
          userPrefix: 'Generate a callout from these recent entries:',
        };

  return createPromptPair(t.system, `${t.userPrefix}\n\n${entriesText}`, vocabulary, language);
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
  const t =
    language === 'ja'
      ? {
          mentionLabel: '回',
          withTopics: (topicList: string) =>
            `最近のつぶやきのトレンドトピックを2〜3文で短くまとめて。パターンに気づく程度で、判断はしない。アドバイスなし。\n\nトピック:\n${topicList}`,
          empty: 'この期間のトピックはなし。静かだったことについて一言。',
        }
      : {
          mentionLabel: ' mentions',
          withTopics: (topicList: string) =>
            `Summarize these trending topics from recent mumbles in 2-3 brief sentences. Notice patterns, don't judge. No advice.\n\nTopics:\n${topicList}`,
          empty: 'No topics found in this period. Say something brief about it being quiet.',
        };

  const topicList = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `- ${name}: ${count}${t.mentionLabel}`)
    .join('\n');

  const content = topicList.length > 0 ? t.withTopics(topicList) : t.empty;

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
  const t =
    language === 'ja'
      ? {
          system: `以前書いたことについて様子を聞きます。
カジュアルに、短く。堅くならない。
例: "あのプロジェクトどう？" とか "眠れるようになった？"`,
          user: `元のエントリー（${scheduledInterval}前に書いたもの）:\n\n${originalEntry}`,
        }
      : {
          system: `You're checking in about something someone wrote earlier.
Keep it casual and brief. Don't be clinical.
Example: "how's that project going?" or "sleep any better?"`,
          user: `Original entry (written ${scheduledInterval} ago):\n\n${originalEntry}`,
        };

  return createPromptPair(t.system, t.user, vocabulary, language);
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
