import { describe, expect, it } from 'vitest';
import {
  MUMBL_SYSTEM_PROMPT,
  createCalloutPrompt,
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
});
