import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReactionConfig } from './reaction-config.js';

describe('getReactionConfig', () => {
  beforeEach(() => {
    delete process.env['MUMBL_REACTIONS_ENABLED'];
    delete process.env['MUMBL_REACTION_TYPE'];
    delete process.env['MUMBL_REACTION_USE_LLM'];
    delete process.env['MUMBL_REACTION_LANGUAGE'];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return defaults when no env vars set', () => {
    const config = getReactionConfig();

    expect(config.enabled).toBe(true);
    expect(config.defaultReactionType).toBe('read');
    expect(config.useLLM).toBe(true);
    expect(config.language).toBe('auto');
  });

  describe('enabled', () => {
    it('should be false when MUMBL_REACTIONS_ENABLED is "false"', () => {
      process.env['MUMBL_REACTIONS_ENABLED'] = 'false';
      expect(getReactionConfig().enabled).toBe(false);
    });

    it('should be true when MUMBL_REACTIONS_ENABLED is "true"', () => {
      process.env['MUMBL_REACTIONS_ENABLED'] = 'true';
      expect(getReactionConfig().enabled).toBe(true);
    });

    it('should be true for any non-"false" value', () => {
      process.env['MUMBL_REACTIONS_ENABLED'] = 'yes';
      expect(getReactionConfig().enabled).toBe(true);
    });
  });

  describe('defaultReactionType', () => {
    it('should accept valid reaction types', () => {
      for (const type of ['read', 'heard', 'thinking', 'with-you', 'custom']) {
        process.env['MUMBL_REACTION_TYPE'] = type;
        expect(getReactionConfig().defaultReactionType).toBe(type);
      }
    });

    it('should fall back to "read" for invalid values', () => {
      process.env['MUMBL_REACTION_TYPE'] = 'invalid';
      expect(getReactionConfig().defaultReactionType).toBe('read');
    });
  });

  describe('useLLM', () => {
    it('should be false when MUMBL_REACTION_USE_LLM is "false"', () => {
      process.env['MUMBL_REACTION_USE_LLM'] = 'false';
      expect(getReactionConfig().useLLM).toBe(false);
    });

    it('should be true for any non-"false" value', () => {
      process.env['MUMBL_REACTION_USE_LLM'] = 'yes';
      expect(getReactionConfig().useLLM).toBe(true);
    });
  });

  describe('language', () => {
    it('should accept valid language modes', () => {
      for (const lang of ['auto', 'ja', 'en']) {
        process.env['MUMBL_REACTION_LANGUAGE'] = lang;
        expect(getReactionConfig().language).toBe(lang);
      }
    });

    it('should fall back to "auto" for invalid values', () => {
      process.env['MUMBL_REACTION_LANGUAGE'] = 'fr';
      expect(getReactionConfig().language).toBe('auto');
    });
  });
});
