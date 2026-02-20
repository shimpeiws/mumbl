/**
 * Detect whether journal entry content contains conversation triggers
 * (questions, dialogue patterns, etc.)
 */

const ENGLISH_QUESTION_STARTERS = [
  'who',
  'what',
  'where',
  'when',
  'why',
  'how',
  'should',
  'could',
  'would',
  'do',
  'does',
  'is',
  'are',
  'can',
  'will',
  'did',
  'has',
  'have',
  'am',
];

const DIALOGUE_PATTERNS = [
  /\bi wonder\b/i,
  /\bthinking about\b/i,
  /\bshould i\b/i,
  /\bwhat if\b/i,
  /\bmaybe i should\b/i,
  /\bi('m| am) not sure\b/i,
  /\bi('m| am) confused\b/i,
  /\bhelp me\b/i,
  /\bwhat do you think\b/i,
  /\bany thoughts\b/i,
  /\bcan you\b/i,
  /\btell me\b/i,
];

const JAPANESE_PATTERNS = [
  /\u304B\u306A[?\uFF1F]?$/, // ends with kana? or kana
  /\u3060\u308D\u3046[?\uFF1F]?$/, // ends with darou? or darou
  /\u306E\u304B\u306A/, // nokana
  /\u3063\u3066\u4F55/, // tte nani
  /\u3069\u3046\u3057\u3088\u3046/, // doushiyou
  /\u3069\u3046\u601D\u3046/, // dou omou
];

/**
 * Check if content ends with a question mark
 */
function hasQuestionMark(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.endsWith('?') || trimmed.endsWith('\uFF1F');
}

/**
 * Check if content starts with an English question word
 */
function startsWithQuestionWord(content: string): boolean {
  const firstWord = content.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return ENGLISH_QUESTION_STARTERS.includes(firstWord);
}

/**
 * Check if content matches dialogue patterns
 */
function matchesDialoguePattern(content: string): boolean {
  return DIALOGUE_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Check if content matches Japanese conversation patterns
 */
function matchesJapanesePattern(content: string): boolean {
  return JAPANESE_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Detect if the given content contains a conversation trigger.
 * Returns true if the content appears to be a question or conversation starter.
 */
export function detectConversationTrigger(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return false;
  }

  if (hasQuestionMark(content)) {
    return true;
  }

  if (startsWithQuestionWord(content) && content.trim().length > 10) {
    return true;
  }

  if (matchesDialoguePattern(content)) {
    return true;
  }

  if (matchesJapanesePattern(content)) {
    return true;
  }

  return false;
}
