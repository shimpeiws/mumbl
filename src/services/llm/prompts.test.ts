import { describe, expect, it } from 'vitest';
import type { VocabularySet } from '../wordgrain/types.js';
import {
  MUMBL_SYSTEM_PROMPT,
  createCalloutPrompt,
  createChatMessages,
  createFollowUpEvaluationPrompt,
  createFollowUpPrompt,
  createReactionPrompt,
  createReflectionPrompt,
  createSummaryPrompt,
  createSystemPrompt,
  createTrendSummaryPrompt,
} from './prompts.js';
import type { Message } from './types.js';

const testVocabulary: VocabularySet = {
  words: ['vibe', 'drip'],
  phrases: ['on god'],
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
    expect(systemContent).toContain('眠れない');
    expect(systemContent).not.toContain('"work is tough"');
    expect(systemContent).not.toContain('"had coffee"');
  });

  it('should not have tsura as first example mapping for ja language', () => {
    const messages = createReactionPrompt('テスト', { language: 'ja' });
    const systemContent = messages[0]?.content ?? '';
    const examplesStart = systemContent.indexOf('Examples:');
    const firstMapping = systemContent.slice(examplesStart, examplesStart + 100);

    expect(firstMapping).not.toContain('-> つら');
  });

  it('should use English examples for en language', () => {
    const messages = createReactionPrompt('test', { language: 'en' });
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('Rapper slang style');
    expect(systemContent).toContain('"work is tough"');
  });

  it('should include variation instruction', () => {
    const messages = createReactionPrompt('test');
    const systemContent = messages[0]?.content ?? '';

    expect(systemContent).toContain('never repeat the same word for different entries');
    expect(systemContent).toContain('spread across all categories');
  });

  it('should include vocabulary when provided', () => {
    const messages = createReactionPrompt('test', undefined, testVocabulary);

    expect(messages[0]?.content).toContain('Vocabulary Reference');
    expect(messages[0]?.content).toContain('vibe');
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
