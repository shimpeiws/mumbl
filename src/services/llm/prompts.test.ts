import { describe, expect, it } from 'vitest';
import {
  MUMBL_SYSTEM_PROMPT,
  createChatMessages,
  createReflectionPrompt,
  createSummaryPrompt,
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

  it('should be in Japanese', () => {
    expect(MUMBL_SYSTEM_PROMPT).toMatch(/[ぁ-んァ-ン]/);
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
