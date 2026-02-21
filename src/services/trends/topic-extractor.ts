/**
 * Topic extraction from entry content
 * Simple text processing without NLP libraries
 */

const ENGLISH_STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'not',
  'no',
  'nor',
  'so',
  'yet',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'than',
  'too',
  'very',
  'just',
  'about',
  'above',
  'after',
  'again',
  'all',
  'also',
  'any',
  'because',
  'before',
  'between',
  'during',
  'even',
  'get',
  'got',
  'go',
  'going',
  'gone',
  'here',
  'how',
  'i',
  'if',
  'into',
  'it',
  'its',
  'let',
  'like',
  'make',
  'me',
  'my',
  'much',
  'new',
  'now',
  'off',
  'old',
  'only',
  'our',
  'out',
  'own',
  'put',
  'say',
  'she',
  'he',
  'him',
  'her',
  'his',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'up',
  'us',
  'we',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'you',
  'your',
  'down',
  'had',
  'still',
  'over',
  'under',
  'really',
  'well',
  'back',
  'thing',
  'things',
  'way',
]);

const JAPANESE_PARTICLES = new Set([
  '\u306F',
  '\u304C',
  '\u3092',
  '\u306B',
  '\u3067',
  '\u3068',
  '\u3082',
  '\u306E',
  '\u304B',
  '\u3088',
  '\u306D',
  '\u306A',
  '\u3051\u3069',
  '\u3060\u3051\u3069',
  '\u3057',
  '\u305F',
  '\u3066',
  '\u3063\u305F',
  '\u3060',
  '\u3067\u3059',
  '\u307E\u3059',
  '\u304B\u3089',
  '\u307E\u3067',
  '\u3088\u308A',
  '\u305D\u306E',
  '\u3053\u306E',
  '\u3042\u306E',
  '\u305D\u308C',
  '\u3053\u308C',
  '\u3042\u308C',
]);

const MIN_WORD_LENGTH = 2;
const MAX_TOPICS = 10;

/**
 * Normalize text for consistent topic matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Split text into tokens (handles both English and Japanese)
 */
function tokenize(text: string): string[] {
  // Split on whitespace and common punctuation
  return text
    .split(/[\s,.!?;:'"()\[\]{}\-_/\\|@#$%^&*+=<>~`]+/)
    .filter((token) => token.length >= MIN_WORD_LENGTH);
}

/**
 * Check if a token is a stop word
 */
function isStopWord(token: string): boolean {
  return ENGLISH_STOP_WORDS.has(token) || JAPANESE_PARTICLES.has(token);
}

/**
 * Extract meaningful single-word topics
 */
function extractUnigrams(tokens: string[]): string[] {
  return tokens.filter((token) => !isStopWord(token) && token.length >= MIN_WORD_LENGTH);
}

/**
 * Extract meaningful bigrams (two-word phrases)
 */
function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const first = tokens[i];
    const second = tokens[i + 1];
    if (first && second && !isStopWord(first) && !isStopWord(second)) {
      bigrams.push(`${first} ${second}`);
    }
  }
  return bigrams;
}

/**
 * Extract meaningful trigrams (three-word phrases)
 */
function extractTrigrams(tokens: string[]): string[] {
  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    const first = tokens[i];
    const second = tokens[i + 1];
    const third = tokens[i + 2];
    if (first && second && third) {
      // Allow one stop word in the middle of a trigram
      const nonStopCount = [first, second, third].filter((t) => !isStopWord(t)).length;
      if (nonStopCount >= 2) {
        trigrams.push(`${first} ${second} ${third}`);
      }
    }
  }
  return trigrams;
}

/**
 * Extract topics from entry content
 * Returns deduplicated, normalized topic strings
 */
export function extractTopics(content: string): string[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const normalized = normalizeText(content);
  const tokens = tokenize(normalized);

  if (tokens.length === 0) {
    return [];
  }

  const unigrams = extractUnigrams(tokens);
  const bigrams = extractBigrams(tokens);
  const trigrams = extractTrigrams(tokens);

  // Combine all topics and deduplicate
  const allTopics = [...trigrams, ...bigrams, ...unigrams];
  const seen = new Set<string>();
  const deduplicated: string[] = [];

  for (const topic of allTopics) {
    if (!seen.has(topic)) {
      seen.add(topic);
      deduplicated.push(topic);
    }
  }

  // Return top topics (longer phrases first, already ordered by trigrams > bigrams > unigrams)
  return deduplicated.slice(0, MAX_TOPICS);
}
