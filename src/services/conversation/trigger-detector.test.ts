import { describe, expect, it } from 'vitest';
import { detectConversationTrigger } from './trigger-detector.js';

describe('detectConversationTrigger', () => {
  describe('empty and invalid input', () => {
    it('should return false for empty string', () => {
      expect(detectConversationTrigger('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(detectConversationTrigger('   ')).toBe(false);
    });
  });

  describe('question mark detection', () => {
    it('should detect content ending with ?', () => {
      expect(detectConversationTrigger('What is this?')).toBe(true);
    });

    it('should detect content ending with fullwidth ?', () => {
      expect(detectConversationTrigger('What is this\uFF1F')).toBe(true);
    });

    it('should detect simple question with trailing space', () => {
      expect(detectConversationTrigger('Really?  ')).toBe(true);
    });
  });

  describe('English question word detection', () => {
    it('should detect "who" questions', () => {
      expect(detectConversationTrigger('Who should I talk to about this')).toBe(true);
    });

    it('should detect "what" questions', () => {
      expect(detectConversationTrigger('What happens if I do that')).toBe(true);
    });

    it('should detect "where" questions', () => {
      expect(detectConversationTrigger('Where should I put this file')).toBe(true);
    });

    it('should detect "when" questions', () => {
      expect(detectConversationTrigger('When is the deadline for this')).toBe(true);
    });

    it('should detect "why" questions', () => {
      expect(detectConversationTrigger('Why does this keep happening')).toBe(true);
    });

    it('should detect "how" questions', () => {
      expect(detectConversationTrigger('How do I fix this problem')).toBe(true);
    });

    it('should detect "should" questions', () => {
      expect(detectConversationTrigger('Should we refactor this module')).toBe(true);
    });

    it('should detect "could" questions', () => {
      expect(detectConversationTrigger('Could this be the cause of the bug')).toBe(true);
    });

    it('should detect "would" questions', () => {
      expect(detectConversationTrigger('Would it make sense to add tests')).toBe(true);
    });

    it('should detect "can" questions', () => {
      expect(detectConversationTrigger('Can someone review this pull request')).toBe(true);
    });

    it('should not trigger on short question-word content', () => {
      expect(detectConversationTrigger('How nice')).toBe(false);
    });

    it('should be case-insensitive for question words', () => {
      expect(detectConversationTrigger('WHO is responsible for this module')).toBe(true);
    });
  });

  describe('dialogue pattern detection', () => {
    it('should detect "I wonder" pattern', () => {
      expect(detectConversationTrigger('I wonder if this is right')).toBe(true);
    });

    it('should detect "thinking about" pattern', () => {
      expect(detectConversationTrigger('Been thinking about refactoring')).toBe(true);
    });

    it('should detect "should I" pattern', () => {
      expect(detectConversationTrigger('Hmm, should I use TypeScript here')).toBe(true);
    });

    it('should detect "what if" pattern', () => {
      expect(detectConversationTrigger('What if we try a different approach')).toBe(true);
    });

    it('should detect "maybe I should" pattern', () => {
      expect(detectConversationTrigger('Maybe I should start over')).toBe(true);
    });

    it('should detect "I\'m not sure" pattern', () => {
      expect(detectConversationTrigger("I'm not sure about this approach")).toBe(true);
    });

    it('should detect "I am not sure" pattern', () => {
      expect(detectConversationTrigger('I am not sure what to do')).toBe(true);
    });

    it('should detect "help me" pattern', () => {
      expect(detectConversationTrigger('Please help me understand this')).toBe(true);
    });

    it('should detect "what do you think" pattern', () => {
      expect(detectConversationTrigger('So what do you think about it')).toBe(true);
    });

    it('should detect "tell me" pattern', () => {
      expect(detectConversationTrigger('Tell me more about this pattern')).toBe(true);
    });
  });

  describe('Japanese pattern detection', () => {
    it('should detect content ending with kana', () => {
      expect(detectConversationTrigger('\u3053\u308C\u3067\u3044\u3044\u306E\u304B\u306A')).toBe(
        true,
      );
    });

    it('should detect content with darou', () => {
      expect(detectConversationTrigger('\u3046\u307E\u304F\u3044\u304F\u3060\u308D\u3046')).toBe(
        true,
      );
    });

    it('should detect content with nokana', () => {
      expect(
        detectConversationTrigger('\u3069\u3046\u3059\u308C\u3070\u3044\u3044\u306E\u304B\u306A'),
      ).toBe(true);
    });

    it('should detect content with tte nani', () => {
      expect(
        detectConversationTrigger(
          '\u30EA\u30D5\u30A1\u30AF\u30BF\u30EA\u30F3\u30B0\u3063\u3066\u4F55',
        ),
      ).toBe(true);
    });

    it('should detect content with doushiyou', () => {
      expect(detectConversationTrigger('\u3069\u3046\u3057\u3088\u3046')).toBe(true);
    });
  });

  describe('non-trigger content', () => {
    it('should not trigger on simple statements', () => {
      expect(detectConversationTrigger('The weather is nice today')).toBe(false);
    });

    it('should not trigger on greetings', () => {
      expect(detectConversationTrigger('Good morning')).toBe(false);
    });

    it('should not trigger on short exclamations', () => {
      expect(detectConversationTrigger('Wow')).toBe(false);
    });

    it('should not trigger on completed tasks', () => {
      expect(detectConversationTrigger('Finished the deployment')).toBe(false);
    });

    it('should not trigger on observations', () => {
      expect(detectConversationTrigger('The build passed all tests')).toBe(false);
    });
  });
});
