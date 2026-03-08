import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenize.js';

describe('tokenize', () => {
  describe('English text', () => {
    it('should split on whitespace and punctuation', () => {
      const tokens = tokenize('coffee, sleep, repeat!');
      expect(tokens).toContain('coffee');
      expect(tokens).toContain('sleep');
      expect(tokens).toContain('repeat');
    });

    it('should filter out short tokens', () => {
      const tokens = tokenize('I a x coffee');
      expect(tokens).not.toContain('I');
      expect(tokens).not.toContain('a');
      expect(tokens).not.toContain('x');
      expect(tokens).toContain('coffee');
    });

    it('should handle special characters', () => {
      const tokens = tokenize('email@work.com project-update #deadline');
      expect(tokens).toContain('email');
      expect(tokens).toContain('work');
      expect(tokens).toContain('project');
      expect(tokens).toContain('update');
      expect(tokens).toContain('deadline');
    });
  });

  describe('Japanese text', () => {
    it('should segment Japanese text into words', () => {
      const tokens = tokenize('仕事がつらい');
      expect(tokens).toContain('仕事');
      expect(tokens).toContain('つらい');
    });

    it('should filter out single-character particles', () => {
      const tokens = tokenize('仕事がつらい');
      // Single-char particle "が" should be filtered by MIN_TOKEN_LENGTH
      expect(tokens).not.toContain('が');
    });

    it('should handle longer Japanese sentences', () => {
      const tokens = tokenize('今日は天気がいい');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens).toContain('今日');
      expect(tokens).toContain('天気');
    });

    it('should handle katakana words', () => {
      const tokens = tokenize('コーヒーを飲んだ');
      expect(tokens).toContain('コーヒー');
    });
  });

  describe('mixed text', () => {
    it('should handle mixed Japanese and English text', () => {
      // Text with >10% CJK will use Japanese segmentation
      const tokens = tokenize('今日のミーティングはproject関連');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      expect(tokenize('   ')).toEqual([]);
    });

    it('should return empty array for only punctuation', () => {
      expect(tokenize('.,!?')).toEqual([]);
    });
  });
});
