export type DetectedLanguage = 'ja' | 'en';

export interface LanguageConfig {
  defaultLanguage: DetectedLanguage;
  mode: 'auto' | DetectedLanguage;
}
