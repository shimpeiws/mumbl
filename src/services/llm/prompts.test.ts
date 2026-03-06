import { describe, expect, it } from 'vitest';
import type { VocabularySet, VocabularyWord } from '../wordgrain/types.js';
import {
  MUMBL_SYSTEM_PROMPT,
  buildBarReferenceSection,
  createCalloutPrompt,
  createChatMessages,
  createFollowUpEvaluationPrompt,
  createFollowUpPrompt,
  createReactionPrompt,
  createReflectionPrompt,
  createSummaryPrompt,
  createSystemPrompt,
  createTrendSummaryPrompt,
  groupByPos,
  sampleBarsForReaction,
  samplePhrasesForReaction,
  sampleVocabularyForReaction,
  weightedSample,
} from './prompts.js';
import type { Message } from './types.js';

const testVocabulary: VocabularySet = {
  words: ['vibe', 'drip'],
  phrases: ['on god'],
  tags: [],
  source: 'test',
  richWords: [{ word: 'drip' }, { word: 'vibe' }],
  bars: [],
};

describe('MUMBL_SYSTEM_PROMPT', () => {
  it('should be defined and non-empty', () => {
    expect(MUMBL_SYSTEM_PROMPT).toBeDefined();
    expect(MUMBL_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention mumbl', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('mumbl');
  });

  it('should include minimal response philosophy', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('minimal');
    expect(MUMBL_SYSTEM_PROMPT).toContain('1-2 sentences');
  });

  it('should include mumbl-specific phrases', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('pluto mode');
    expect(MUMBL_SYSTEM_PROMPT).toContain('la di da di da');
    expect(MUMBL_SYSTEM_PROMPT).toContain('freebandz');
  });

  it('should prohibit giving advice', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('No lectures');
    expect(MUMBL_SYSTEM_PROMPT).toContain('no advice');
  });

  it('should include safety guidelines', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('Safety');
    expect(MUMBL_SYSTEM_PROMPT).toContain('No medical advice');
  });
});

describe('createChatMessages', () => {
  it('should create messages with system prompt and user message', () => {
    const messages = createChatMessages('Hello');

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(MUMBL_SYSTEM_PROMPT);
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('Hello');
  });

  it('should include history between system prompt and user message', () => {
    const history: Message[] = [
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous response' },
    ];

    const messages = createChatMessages('New message', history);

    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('Previous message');
    expect(messages[2].role).toBe('assistant');
    expect(messages[2].content).toBe('Previous response');
    expect(messages[3].role).toBe('user');
    expect(messages[3].content).toBe('New message');
  });

  it('should work with empty history', () => {
    const messages = createChatMessages('Hello', []);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });
});

describe('createSummaryPrompt', () => {
  it('should create messages for summarizing entries', () => {
    const entries = ['Today was good', 'Worked on a project', 'Had lunch with friends'];

    const messages = createSummaryPrompt(entries);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('1. Today was good');
    expect(messages[1].content).toContain('2. Worked on a project');
    expect(messages[1].content).toContain('3. Had lunch with friends');
  });

  it('should handle single entry', () => {
    const entries = ['Only entry'];

    const messages = createSummaryPrompt(entries);

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain('1. Only entry');
  });

  it('should handle empty entries array', () => {
    const messages = createSummaryPrompt([]);

    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('user');
  });

  it('should emphasize pattern noticing without judgment', () => {
    const messages = createSummaryPrompt(['test']);

    expect(messages[0].content).toContain('patterns');
    expect(messages[0].content).toContain('No advice');
  });
});

describe('createReflectionPrompt', () => {
  it('should create messages for reflecting on an entry', () => {
    const entry = 'Today I felt anxious about the meeting.';

    const messages = createReflectionPrompt(entry);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain(entry);
  });

  it('should include the entry in the user message', () => {
    const entry = 'Completed a big project today!';

    const messages = createReflectionPrompt(entry);

    expect(messages[1].content).toContain('Completed a big project today!');
  });

  it('should emphasize minimal responses', () => {
    const messages = createReflectionPrompt('test');

    expect(messages[0].content).toContain('One short observation');
    expect(messages[0].content).toContain("Don't dig");
  });

  it('should include good and bad examples', () => {
    const messages = createReflectionPrompt('test');

    expect(messages[0].content).toContain('Good:');
    expect(messages[0].content).toContain('Bad:');
  });
});

describe('createCalloutPrompt', () => {
  it('should create messages with system and user roles', () => {
    const entries = ['worked late', 'tired today'];

    const messages = createCalloutPrompt(entries);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('should include numbered entries in user message', () => {
    const entries = ['entry one', 'entry two', 'entry three'];

    const messages = createCalloutPrompt(entries);

    expect(messages[1]?.content).toContain('1. entry one');
    expect(messages[1]?.content).toContain('2. entry two');
    expect(messages[1]?.content).toContain('3. entry three');
  });

  it('should limit entries to first 5', () => {
    const entries = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    const messages = createCalloutPrompt(entries);

    expect(messages[1]?.content).toContain('5. e');
    expect(messages[1]?.content).not.toContain('6. f');
  });

  it('should handle empty entries array', () => {
    const messages = createCalloutPrompt([]);

    expect(messages).toHaveLength(2);
    expect(messages[1]?.role).toBe('user');
  });

  it('should specify casual tone and max character limit', () => {
    const messages = createCalloutPrompt(['test']);

    expect(messages[0]?.content).toContain('casual tone');
    expect(messages[0]?.content).toContain('Max 50 characters');
  });

  it('should prohibit questions and advice', () => {
    const messages = createCalloutPrompt(['test']);

    expect(messages[0]?.content).toContain('No questions, no advice');
  });

  it('should include vocabulary when provided', () => {
    const messages = createCalloutPrompt(['test'], testVocabulary);

    expect(messages[0]?.content).toContain('Vocabulary Reference');
    expect(messages[0]?.content).toContain('vibe');
    expect(messages[0]?.content).toContain('on god');
  });
});

describe('createReactionPrompt', () => {
  it('should create messages with system and user roles', () => {
    const messages = createReactionPrompt('feeling tired');

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
    expect(messages[1]?.content).toBe('feeling tired');
  });

  it('should use Japanese examples with Japanese input text for ja language', () => {
    const messages = createReactionPrompt('疲れた', { language: 'ja' });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Japanese slang style');
    expect(systemContent).toContain('仕事だるい');
    expect(systemContent).toContain('コーヒー飲んだ');
    expect(systemContent).not.toContain('"work is tough"');
    expect(systemContent).not.toContain('"had coffee"');
  });

  it('should include new category examples for ja language', () => {
    const messages = createReactionPrompt('テスト', { language: 'ja' });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('おつ');
    expect(systemContent).toContain('まじか');
    expect(systemContent).toContain('きつそう');
  });

  it('should use English examples for en language', () => {
    const messages = createReactionPrompt('test', { language: 'en' });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Rapper slang style');
    expect(systemContent).toContain('"work is tough"');
  });

  it('should include variation instruction and mood mapping', () => {
    const messages = createReactionPrompt('test');
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Vary your responses');
    expect(systemContent).toContain('Mood mapping');
    expect(systemContent).toContain('classify the entry');
  });

  it('should include mood mapping rules for ja language', () => {
    const messages = createReactionPrompt('テスト', { language: 'ja' });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Achievement (おつ)');
    expect(systemContent).toContain('Negative/tough (きつそう)');
    expect(systemContent).toContain('Surprise (まじか)');
    expect(systemContent).toContain('Feeling it (それな)');
  });

  it('should include mood mapping rules for en language', () => {
    const messages = createReactionPrompt('test', { language: 'en' });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Achievement (lets go)');
    expect(systemContent).toContain('Negative/tough (felt that)');
    expect(systemContent).toContain('Surprise (no way)');
  });

  it('should include dedup block when recentReactions provided', () => {
    const messages = createReactionPrompt('test', {
      recentReactions: ['うん', 'そう', 'な'],
    });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('DEDUP (STRICTLY ENFORCED)');
    expect(systemContent).toContain('"うん" <- BANNED');
    expect(systemContent).toContain('"そう" <- BANNED');
    expect(systemContent).toContain('"な" <- BANNED');
  });

  it('should not include dedup block when no recentReactions', () => {
    const messages = createReactionPrompt('test');
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).not.toContain('DEDUP');
  });

  it('should not include dedup block when recentReactions is empty', () => {
    const messages = createReactionPrompt('test', { recentReactions: [] });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).not.toContain('DEDUP');
  });

  it('should include vocabulary in priority section when provided', () => {
    const messages = createReactionPrompt('test', undefined, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('YOUR VOCABULARY (use when it fits)');
    expect(systemContent).toContain('Words: drip, vibe');
    expect(systemContent).toContain('Phrases: on god');
  });

  it('should include natural usage guidance for English vocabulary', () => {
    const messages = createReactionPrompt('test', { language: 'en' }, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('genuinely fits the mood');
    expect(systemContent).toContain('Do NOT mechanically slot words');
  });

  it('should include natural usage guidance for Japanese vocabulary', () => {
    const messages = createReactionPrompt('テスト', { language: 'ja' }, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('genuinely fits the mood');
    expect(systemContent).toContain('Do NOT mechanically attach particles');
  });

  it('should not contain mechanical template patterns in vocabulary section', () => {
    const messages = createReactionPrompt('テスト', { language: 'ja' }, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    // Should not have "dripだな" or similar mechanical vocab+particle templates
    expect(systemContent).not.toContain('dripだな');
    expect(systemContent).not.toContain('dripじゃん');
    expect(systemContent).not.toContain('vibeよな');
    // Should not have the old "Vocab word + particle:" instruction pattern
    expect(systemContent).not.toContain('Vocab word + particle');
  });

  it('should include mood mapping even when vocabulary is provided', () => {
    const messages = createReactionPrompt('test', { language: 'en' }, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('YOUR VOCABULARY (use when it fits)');
    expect(systemContent).toContain('Mood mapping');
    expect(systemContent).toContain('classify the entry');
  });

  it('should not include generic examples when vocabulary is provided', () => {
    const messages = createReactionPrompt('test', { language: 'en' }, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('YOUR VOCABULARY (use when it fits)');
    // Generic examples block should be excluded when vocabulary is provided
    expect(systemContent).not.toContain('"snack was good" -> fire');
    expect(systemContent).not.toContain('"baby took first steps" -> no way');
  });
});

describe('sampleVocabularyForReaction', () => {
  it('should return all words as VocabularyWord when count is within limit', () => {
    const vocab: VocabularySet = {
      words: ['hey', 'yo', 'sup'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'hey' }, { word: 'yo' }, { word: 'sup' }],
      bars: [],
    };
    const result = sampleVocabularyForReaction(vocab);
    expect(result).toEqual([{ word: 'hey' }, { word: 'yo' }, { word: 'sup' }]);
  });

  it('should filter out long words', () => {
    const vocab: VocabularySet = {
      words: ['short', 'this-is-a-very-long-word-that-exceeds-limit'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'short' }, { word: 'this-is-a-very-long-word-that-exceeds-limit' }],
      bars: [],
    };
    const result = sampleVocabularyForReaction(vocab);
    expect(result).toEqual([{ word: 'short' }]);
  });

  it('should sample when exceeding maxCount without duplicates', () => {
    const richWords = Array.from({ length: 30 }, (_, i) => ({ word: `w${i}` }));
    const words = richWords.map((rw) => rw.word);
    const vocab: VocabularySet = {
      words,
      phrases: [],
      tags: [],
      source: 'test',
      richWords,
      bars: [],
    };
    const result = sampleVocabularyForReaction(vocab, 10);
    expect(result).toHaveLength(10);
    for (const w of result) {
      expect(words).toContain(w.word);
    }
    const resultWords = result.map((r) => r.word);
    expect(new Set(resultWords).size).toBe(10);
  });

  it('should default to sampling 20 words', () => {
    const richWords = Array.from({ length: 50 }, (_, i) => ({ word: `w${i}` }));
    const words = richWords.map((rw) => rw.word);
    const vocab: VocabularySet = {
      words,
      phrases: [],
      tags: [],
      source: 'test',
      richWords,
      bars: [],
    };
    const result = sampleVocabularyForReaction(vocab);
    expect(result).toHaveLength(20);
  });

  it('should return empty array when no short words exist', () => {
    const vocab: VocabularySet = {
      words: ['this-is-way-too-long-for-reaction'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'this-is-way-too-long-for-reaction' }],
      bars: [],
    };
    const result = sampleVocabularyForReaction(vocab);
    expect(result).toEqual([]);
  });

  it('should fallback to plain words when richWords is empty', () => {
    const vocab: VocabularySet = {
      words: ['hey', 'yo'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [],
      bars: [],
    };
    const result = sampleVocabularyForReaction(vocab);
    expect(result).toEqual([{ word: 'hey' }, { word: 'yo' }]);
  });

  it('should include recent entries context when provided', () => {
    const messages = createReactionPrompt('feeling tired', {
      recentEntries: ['had a long day', 'work was stressful'],
    });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Previous mumbles');
    expect(systemContent).toContain('1. had a long day');
    expect(systemContent).toContain('2. work was stressful');
    expect(systemContent).toContain('DO NOT mention or reference their content');
  });

  it('should not include recent entries section when array is empty', () => {
    const messages = createReactionPrompt('feeling tired', {
      recentEntries: [],
    });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).not.toContain('Previous mumbles');
  });

  it('should not include recent entries section when undefined', () => {
    const messages = createReactionPrompt('feeling tired', {});
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).not.toContain('Previous mumbles');
  });

  it('should include recent entries with Japanese language', () => {
    const messages = createReactionPrompt('疲れた', {
      language: 'ja',
      recentEntries: ['長い一日だった', '仕事がきつかった'],
    });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('前のつぶやき');
    expect(systemContent).toContain('1. 長い一日だった');
    expect(systemContent).toContain('2. 仕事がきつかった');
    expect(systemContent).toContain('内容には触れないこと');
  });
});

describe('samplePhrasesForReaction', () => {
  it('should return all phrases when count is within limit', () => {
    const vocab: VocabularySet = {
      words: [],
      phrases: ['on god', 'no cap'],
      tags: [],
      source: 'test',
      richWords: [],
      bars: [],
    };
    const result = samplePhrasesForReaction(vocab);
    expect(result).toEqual(['on god', 'no cap']);
  });

  it('should return empty array when no phrases exist', () => {
    const vocab: VocabularySet = {
      words: ['hey'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'hey' }],
      bars: [],
    };
    const result = samplePhrasesForReaction(vocab);
    expect(result).toEqual([]);
  });

  it('should randomly sample when exceeding maxCount', () => {
    const phrases = Array.from({ length: 20 }, (_, i) => `phrase ${i}`);
    const vocab: VocabularySet = {
      words: [],
      phrases,
      tags: [],
      source: 'test',
      richWords: [],
      bars: [],
    };
    const result = samplePhrasesForReaction(vocab, 5);
    expect(result).toHaveLength(5);
    for (const p of result) {
      expect(phrases).toContain(p);
    }
    expect(new Set(result).size).toBe(5);
  });
});

describe('weightedSample', () => {
  it('should return all items when count exceeds items length', () => {
    const items: VocabularyWord[] = [{ word: 'a' }, { word: 'b' }];
    const result = weightedSample(items, 5);
    expect(result).toHaveLength(2);
  });

  it('should return requested count of items', () => {
    const items: VocabularyWord[] = Array.from({ length: 20 }, (_, i) => ({
      word: `w${i}`,
      frequency: i * 10,
    }));
    const result = weightedSample(items, 5);
    expect(result).toHaveLength(5);
    const words = result.map((r) => r.word);
    expect(new Set(words).size).toBe(5);
  });

  it('should produce no duplicates (without replacement)', () => {
    const items: VocabularyWord[] = Array.from({ length: 10 }, (_, i) => ({
      word: `w${i}`,
      frequency: 100,
    }));
    const result = weightedSample(items, 8);
    const words = result.map((r) => r.word);
    expect(new Set(words).size).toBe(8);
  });

  it('should handle items without frequency (defaults to weight 1)', () => {
    const items: VocabularyWord[] = [{ word: 'a' }, { word: 'b' }, { word: 'c' }];
    const result = weightedSample(items, 2);
    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(['a', 'b', 'c']).toContain(r.word);
    }
  });
});

describe('groupByPos', () => {
  it('should group words by their POS tag', () => {
    const words: VocabularyWord[] = [
      { word: 'drip', pos: 'noun' },
      { word: 'flex', pos: 'verb' },
      { word: 'hustle', pos: 'noun' },
    ];
    const groups = groupByPos(words);
    expect(groups.get('noun')).toEqual(['drip', 'hustle']);
    expect(groups.get('verb')).toEqual(['flex']);
  });

  it('should group words without POS under mixed', () => {
    const words: VocabularyWord[] = [
      { word: 'drip', pos: 'noun' },
      { word: 'chill' },
      { word: 'vibe' },
    ];
    const groups = groupByPos(words);
    expect(groups.get('noun')).toEqual(['drip']);
    expect(groups.get('mixed')).toEqual(['chill', 'vibe']);
  });

  it('should return empty map for empty input', () => {
    const groups = groupByPos([]);
    expect(groups.size).toBe(0);
  });
});

describe('POS-aware vocabulary prompt', () => {
  it('should show POS-grouped words when POS data is available', () => {
    const vocabWithPos: VocabularySet = {
      words: ['drip', 'flex'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [
        { word: 'drip', pos: 'noun', frequency: 42 },
        { word: 'flex', pos: 'verb', frequency: 10 },
      ],
      bars: [],
    };
    const messages = createReactionPrompt('test', { language: 'en' }, vocabWithPos);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Noun (use as subjects/objects): drip');
    expect(systemContent).toContain('Verb (use for actions): flex');
    expect(systemContent).not.toContain('Words: drip, flex');
  });

  it('should show flat Words list when no POS data', () => {
    const vocabNoPos: VocabularySet = {
      words: ['drip', 'flex'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'drip' }, { word: 'flex' }],
      bars: [],
    };
    const messages = createReactionPrompt('test', { language: 'en' }, vocabNoPos);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Words: drip, flex');
    expect(systemContent).not.toContain('Noun (');
  });

  it('should group mixed POS and no-POS words correctly', () => {
    const vocabMixed: VocabularySet = {
      words: ['drip', 'chill', 'flex'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'chill' }, { word: 'drip', pos: 'noun' }, { word: 'flex', pos: 'verb' }],
      bars: [],
    };
    const messages = createReactionPrompt('test', { language: 'en' }, vocabMixed);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Noun (use as subjects/objects): drip');
    expect(systemContent).toContain('Verb (use for actions): flex');
    expect(systemContent).toContain('Mixed (general use): chill');
  });
});

describe('createFollowUpEvaluationPrompt', () => {
  it('should create messages with system and user roles', () => {
    const messages = createFollowUpEvaluationPrompt('feeling stressed');

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
    expect(messages[1]?.content).toBe('feeling stressed');
  });

  it('should include vocabulary when provided', () => {
    const messages = createFollowUpEvaluationPrompt('feeling stressed', testVocabulary);

    expect(messages[0]?.content).toContain('Vocabulary Reference');
    expect(messages[0]?.content).toContain('drip');
  });
});

describe('createFollowUpPrompt', () => {
  it('should create messages with system and user roles', () => {
    const messages = createFollowUpPrompt('big deadline tomorrow', '1d');

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.content).toContain('big deadline tomorrow');
    expect(messages[1]?.content).toContain('1d ago');
  });

  it('should include vocabulary when provided', () => {
    const messages = createFollowUpPrompt('big deadline', '3d', testVocabulary);

    expect(messages[0]?.content).toContain('Vocabulary Reference');
    expect(messages[0]?.content).toContain('vibe');
  });

  it('should use Japanese prompts when language is ja', () => {
    const messages = createFollowUpPrompt('big deadline', '1d', undefined, 'ja');

    expect(messages[0]?.content).toContain('以前書いたことについて');
    expect(messages[1]?.content).toContain('1d前に書いたもの');
  });
});

describe('createTrendSummaryPrompt', () => {
  it('should create user message with topic counts', () => {
    const message = createTrendSummaryPrompt({ work: 5, sleep: 3 });

    expect(message.role).toBe('user');
    expect(message.content).toContain('work: 5 mentions');
    expect(message.content).toContain('sleep: 3 mentions');
  });

  it('should handle empty topics', () => {
    const message = createTrendSummaryPrompt({});

    expect(message.content).toContain('No topics found');
  });

  it('should use Japanese prompts when language is ja', () => {
    const message = createTrendSummaryPrompt({ work: 5 }, 'ja');

    expect(message.content).toContain('トレンドトピック');
    expect(message.content).toContain('work: 5回');
  });

  it('should handle empty topics in Japanese', () => {
    const message = createTrendSummaryPrompt({}, 'ja');

    expect(message.content).toContain('トピックはなし');
  });
});

describe('Japanese language support', () => {
  describe('createSystemPrompt', () => {
    it('should return Japanese base prompt when language is ja', () => {
      const prompt = createSystemPrompt('ja');

      expect(prompt).toContain('あなたはmumbl');
      expect(prompt).toContain('pluto mode');
      expect(prompt).toContain('freebandz');
      expect(prompt).not.toContain('You are mumbl');
    });

    it('should return English base prompt when language is en', () => {
      const prompt = createSystemPrompt('en');

      expect(prompt).toContain('You are mumbl');
      expect(prompt).not.toContain('あなたはmumbl');
    });

    it('should return English base prompt when language is undefined', () => {
      const prompt = createSystemPrompt();

      expect(prompt).toBe(MUMBL_SYSTEM_PROMPT);
    });

    it('should append user context to Japanese prompt', () => {
      const prompt = createSystemPrompt('ja', '\n\nExtra context');

      expect(prompt).toContain('あなたはmumbl');
      expect(prompt).toContain('Extra context');
    });
  });

  describe('createChatMessages', () => {
    it('should use Japanese system prompt when language is ja', () => {
      const messages = createChatMessages('hello', undefined, undefined, undefined, 'ja');

      expect(messages[0]?.content).toContain('あなたはmumbl');
    });
  });

  describe('createSummaryPrompt', () => {
    it('should use Japanese prompts when language is ja', () => {
      const messages = createSummaryPrompt(['test entry'], undefined, 'ja');

      expect(messages[0]?.content).toContain('つぶやきを要約');
      expect(messages[0]?.content).toContain('アドバイスしない');
      expect(messages[1]?.content).toContain('エントリーを要約して');
    });
  });

  describe('createReflectionPrompt', () => {
    it('should use Japanese prompts when language is ja', () => {
      const messages = createReflectionPrompt('test entry', undefined, 'ja');

      expect(messages[0]?.content).toContain('つぶやきを振り返ります');
      expect(messages[0]?.content).toContain('セラピストにならない');
      expect(messages[1]?.content).toContain('短く振り返って');
    });
  });

  describe('createCalloutPrompt', () => {
    it('should use Japanese prompts when language is ja', () => {
      const messages = createCalloutPrompt(['test'], undefined, 'ja');

      expect(messages[0]?.content).toContain('声かけメッセージ');
      expect(messages[0]?.content).toContain('アドバイスしない');
      expect(messages[1]?.content).toContain('声かけを生成して');
    });
  });

  describe('createFollowUpEvaluationPrompt', () => {
    it('should use Japanese prompts when language is ja', () => {
      const messages = createFollowUpEvaluationPrompt('stressed', undefined, 'ja');

      expect(messages[0]?.content).toContain('フォローアップが必要か');
      expect(messages[0]?.content).toContain('JSONのみで回答');
    });
  });

  describe('createFollowUpPrompt', () => {
    it('should use Japanese prompts when language is ja', () => {
      const messages = createFollowUpPrompt('deadline', '1d', undefined, 'ja');

      expect(messages[0]?.content).toContain('以前書いたことについて');
      expect(messages[1]?.content).toContain('1d前に書いたもの');
    });
  });

  describe('vocabulary section', () => {
    it('should use Japanese header when language is ja', () => {
      const messages = createSummaryPrompt(['test'], testVocabulary, 'ja');

      expect(messages[0]?.content).toContain('ボキャブラリー参考');
      expect(messages[0]?.content).toContain('参考にして');
    });

    it('should use English header when language is en', () => {
      const messages = createSummaryPrompt(['test'], testVocabulary, 'en');

      expect(messages[0]?.content).toContain('Vocabulary Reference');
      expect(messages[0]?.content).toContain('Draw from these');
    });
  });
});

describe('sampleBarsForReaction', () => {
  it('should return all bars when count is within limit', () => {
    const vocab: VocabularySet = {
      words: [],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [],
      bars: [
        { text: 'line one', source: { artist: 'KOHH', track: 'Track A' } },
        { text: 'line two' },
      ],
    };
    const result = sampleBarsForReaction(vocab);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no bars exist', () => {
    const vocab: VocabularySet = {
      words: [],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [],
      bars: [],
    };
    const result = sampleBarsForReaction(vocab);
    expect(result).toEqual([]);
  });

  it('should sample when exceeding maxCount', () => {
    const bars = Array.from({ length: 20 }, (_, i) => ({ text: `bar ${i}` }));
    const vocab: VocabularySet = {
      words: [],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [],
      bars,
    };
    const result = sampleBarsForReaction(vocab, 3);
    expect(result).toHaveLength(3);
    for (const b of result) {
      expect(bars.map((x) => x.text)).toContain(b.text);
    }
  });
});

describe('buildBarReferenceSection', () => {
  it('should build English section with artist and track', () => {
    const bars = [
      { text: 'hello world', source: { artist: 'KOHH', track: 'Real Love' } },
      { text: 'another line' },
    ];
    const section = buildBarReferenceSection(bars);

    expect(section).toContain('LYRIC REFERENCES');
    expect(section).toContain('Bars from KOHH');
    expect(section).toContain('"hello world" (Real Love)');
    expect(section).toContain('"another line"');
    expect(section).toContain("Don't force it");
  });

  it('should build Japanese section when language is ja', () => {
    const bars = [{ text: 'some bar', source: { artist: 'KOHH' } }];
    const section = buildBarReferenceSection(bars, 'ja');

    expect(section).toContain('KOHH のバー');
    expect(section).toContain('無理に入れない');
  });

  it('should return empty string for empty bars', () => {
    const section = buildBarReferenceSection([]);
    expect(section).toBe('');
  });
});

describe('createReactionPrompt with bars', () => {
  it('should include bar reference section when vocabulary has bars', () => {
    const vocabWithBars: VocabularySet = {
      words: ['drip'],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [{ word: 'drip' }],
      bars: [{ text: 'lyric line', source: { artist: 'KOHH', track: 'Track' } }],
    };
    const messages = createReactionPrompt('test', { language: 'en' }, vocabWithBars);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('LYRIC REFERENCES');
    expect(systemContent).toContain('"lyric line" (Track)');
  });

  it('should not include bar section when vocabulary has no bars', () => {
    const messages = createReactionPrompt('test', { language: 'en' }, testVocabulary);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).not.toContain('LYRIC REFERENCES');
  });

  it('should suppress generic examples when bars are present even without words', () => {
    const barOnlyVocab: VocabularySet = {
      words: [],
      phrases: [],
      tags: [],
      source: 'test',
      richWords: [],
      bars: [{ text: 'a bar line' }],
    };
    const messages = createReactionPrompt('test', { language: 'en' }, barOnlyVocab);
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('LYRIC REFERENCES');
    expect(systemContent).not.toContain('"snack was good" -> fire');
    expect(systemContent).not.toContain('Word/phrase reference');
  });
});
