import { describe, expect, it } from 'vitest';
import {
  MUMBL_SYSTEM_PROMPT,
  createBriefResponsePrompt,
  createChatMessages,
  createReactionPrompt,
  createReflectionPrompt,
  createSummaryPrompt,
  createTrendPrompt,
} from './prompts.js';
import type { Message } from './types.js';

describe('MUMBL_SYSTEM_PROMPT', () => {
  it('should be defined and non-empty', () => {
    expect(MUMBL_SYSTEM_PROMPT).toBeDefined();
    expect(MUMBL_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should mention mumbl', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('mumbl');
  });

  it('should be in English', () => {
    expect(MUMBL_SYSTEM_PROMPT).toMatch(
      /^[^\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]+$/,
    );
  });

  it('should include minimal response philosophy', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('.');
    expect(MUMBL_SYSTEM_PROMPT).toContain('...');
  });

  it('should include mumbl-specific phrases', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('pluto');
    expect(MUMBL_SYSTEM_PROMPT).toContain('la di da di da');
    expect(MUMBL_SYSTEM_PROMPT).toContain('mask off');
  });

  it('should prohibit giving advice', () => {
    expect(MUMBL_SYSTEM_PROMPT).toContain('No lectures');
    expect(MUMBL_SYSTEM_PROMPT.toLowerCase()).toContain('advice');
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
});

describe('createTrendPrompt', () => {
  it('should create messages for detecting patterns in entries', () => {
    const entries = ['Work was stressful', 'Boss gave feedback', 'Team meeting went long'];

    const messages = createTrendPrompt(entries);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('pattern');
    expect(messages[1].role).toBe('user');
  });

  it('should format entries with numbers', () => {
    const entries = ['Entry A', 'Entry B'];

    const messages = createTrendPrompt(entries);

    expect(messages[1].content).toContain('1. Entry A');
    expect(messages[1].content).toContain('2. Entry B');
  });

  it('should be the same as createSummaryPrompt (legacy)', () => {
    const entries = ['test entry'];

    const trendMessages = createTrendPrompt(entries);
    const summaryMessages = createSummaryPrompt(entries);

    expect(trendMessages).toEqual(summaryMessages);
  });
});

describe('createReactionPrompt', () => {
  it('should create messages for choosing minimal reaction', () => {
    const entry = 'Just feeling tired today';

    const messages = createReactionPrompt(entry);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe(entry);
  });

  it('should include reaction options in system prompt', () => {
    const messages = createReactionPrompt('test');

    const systemContent = messages[0].content;
    expect(systemContent).toContain('.');
    expect(systemContent).toContain('...');
    expect(systemContent).toContain('listening');
  });
});

describe('createBriefResponsePrompt', () => {
  it('should create messages for brief response', () => {
    const entry = 'What do you think about my situation?';

    const messages = createBriefResponsePrompt(entry);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe(entry);
  });

  it('should include context when provided', () => {
    const entry = 'How should I handle this?';
    const context = 'User has been stressed about work';

    const messages = createBriefResponsePrompt(entry, context);

    expect(messages[0].content).toContain(context);
  });

  it('should not include context section when not provided', () => {
    const entry = 'Just wondering';

    const messages = createBriefResponsePrompt(entry);

    expect(messages[0].content).not.toContain('Recent context:');
  });

  it('should emphasize short responses', () => {
    const messages = createBriefResponsePrompt('test');

    expect(messages[0].content).toContain('1-2 sentences');
    expect(messages[0].content).toContain('No lectures');
  });
});
