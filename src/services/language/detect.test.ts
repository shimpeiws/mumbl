import { describe, expect, it } from 'vitest';
import { detectLanguage } from './detect.js';

describe('detectLanguage', () => {
  describe('Japanese text', () => {
    it('should detect hiragana text as Japanese', () => {
      expect(detectLanguage('おはよう')).toBe('ja');
    });

    it('should detect katakana text as Japanese', () => {
      expect(detectLanguage('コーヒー')).toBe('ja');
    });

    it('should detect kanji text as Japanese', () => {
      expect(detectLanguage('仕事つらい')).toBe('ja');
    });

    it('should detect mixed Japanese text', () => {
      expect(detectLanguage('今日はカフェでコーヒーを飲んだ')).toBe('ja');
    });

    it('should detect Japanese with some ASCII', () => {
      expect(detectLanguage('今日はOKだった')).toBe('ja');
    });
  });

  describe('English text', () => {
    it('should detect plain English text', () => {
      expect(detectLanguage('I had a good day today')).toBe('en');
    });

    it('should detect short English text', () => {
      expect(detectLanguage('hello')).toBe('en');
    });

    it('should detect English with numbers', () => {
      expect(detectLanguage('worked 8 hours today')).toBe('en');
    });
  });

  describe('mixed content', () => {
    it('should detect as Japanese when CJK ratio exceeds threshold', () => {
      // More than 10% CJK characters
      expect(detectLanguage('今日 is good')).toBe('ja');
    });

    it('should detect as English when CJK ratio is below threshold', () => {
      // Very few CJK characters relative to total
      expect(detectLanguage('This is a very long English sentence with just one 字')).toBe('en');
    });
  });

  describe('edge cases', () => {
    it('should return en for empty string', () => {
      expect(detectLanguage('')).toBe('en');
    });

    it('should return en for whitespace-only string', () => {
      expect(detectLanguage('   ')).toBe('en');
    });

    it('should return en for numbers only', () => {
      expect(detectLanguage('12345')).toBe('en');
    });

    it('should return en for symbols only', () => {
      expect(detectLanguage('!@#$%')).toBe('en');
    });
  });
});
