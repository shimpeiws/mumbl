import type { ReactionType } from '../../repositories/types.js';
import type { ReactionConfig } from '../../services/reaction-service.js';

type LanguageMode = 'auto' | 'ja' | 'en';

/**
 * Get reaction configuration from environment variables
 *
 * Environment variables:
 * - MUMBL_REACTIONS_ENABLED: Enable/disable reactions (default: true)
 * - MUMBL_REACTION_TYPE: Default reaction type (default: 'read')
 * - MUMBL_REACTION_USE_LLM: Use LLM for generating reactions (default: true)
 * - MUMBL_REACTION_LANGUAGE: Language mode for reactions (default: 'auto')
 *   Values: 'auto' | 'ja' | 'en'
 */
export function getReactionConfig(): ReactionConfig {
  const enabledEnv = process.env['MUMBL_REACTIONS_ENABLED'];
  const reactionTypeEnv = process.env['MUMBL_REACTION_TYPE'];
  const useLLMEnv = process.env['MUMBL_REACTION_USE_LLM'];
  const languageEnv = process.env['MUMBL_REACTION_LANGUAGE'];

  // Parse enabled - defaults to true, only false if explicitly set to 'false'
  const enabled = enabledEnv !== 'false';

  // Parse reaction type - validate against allowed values
  const validReactionTypes: ReactionType[] = ['read', 'heard', 'thinking', 'with-you', 'custom'];
  const defaultReactionType: ReactionType = validReactionTypes.includes(
    reactionTypeEnv as ReactionType,
  )
    ? (reactionTypeEnv as ReactionType)
    : 'read';

  // Parse useLLM - defaults to true, only false if explicitly set to 'false'
  const useLLM = useLLMEnv !== 'false';

  // Parse language mode - validate against allowed values, default to 'auto'
  const validLanguageModes: LanguageMode[] = ['auto', 'ja', 'en'];
  const language: LanguageMode = validLanguageModes.includes(languageEnv as LanguageMode)
    ? (languageEnv as LanguageMode)
    : 'auto';

  return {
    enabled,
    defaultReactionType,
    useLLM,
    language,
  };
}
