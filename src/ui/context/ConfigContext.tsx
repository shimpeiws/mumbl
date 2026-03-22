import * as path from 'node:path';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { saveConfigFile } from '../../config/ConfigFile.js';
import type { MumblFeatures, ResolvedConfig } from '../../config/types.js';
import {
  type WordgrainFileInfo,
  type WordgrainStats,
  getWordgrainFileInfo,
  getWordgrainStats,
  loadVocabulary,
  validateWordgrainFile,
} from '../../services/wordgrain/index.js';
import type { VocabularySet } from '../../services/wordgrain/types.js';
import { useServices } from './ServiceContext.js';

export type ConfigSubMode = 'normal' | 'add-file' | 'delete-confirm';

interface ConfigContextValue {
  config: ResolvedConfig;
  file: WordgrainFileInfo | null;
  stats: WordgrainStats;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  subMode: ConfigSubMode;
  setSubMode: (mode: ConfigSubMode) => void;
  error: string | null;
  clearError: () => void;
  setFile: (sourcePath: string) => void;
  clearFile: () => void;
  reloadFile: () => void;
  features: MumblFeatures;
  toggleFeature: (key: keyof MumblFeatures) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

interface ConfigProviderProps {
  config: ResolvedConfig;
  children: React.ReactNode;
}

const emptyStats: WordgrainStats = {
  totalGrains: 0,
  wordCount: 0,
  phraseCount: 0,
  tagCount: 0,
  barCount: 0,
};

const emptyVocabulary: VocabularySet = {
  words: [],
  phrases: [],
  tags: [],
  source: '',
  richWords: [],
  bars: [],
};

export function ConfigProvider({ config, children }: ConfigProviderProps) {
  const { llmService, reactionService } = useServices();
  const [wordgrainFile, setWordgrainFile] = useState<string | undefined>(config.wordgrainFile);
  const [file, setFileInfo] = useState<WordgrainFileInfo | null>(null);
  const [stats, setStats] = useState<WordgrainStats>(emptyStats);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subMode, setSubMode] = useState<ConfigSubMode>('normal');
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<MumblFeatures>(config.features);

  const refreshFile = useCallback(() => {
    if (!wordgrainFile) {
      setFileInfo(null);
      setStats(emptyStats);
      return;
    }
    setFileInfo(getWordgrainFileInfo(wordgrainFile));
    setStats(getWordgrainStats(wordgrainFile));
  }, [wordgrainFile]);

  const hotReload = useCallback(() => {
    if (!wordgrainFile) {
      llmService.setVocabulary(emptyVocabulary);
      reactionService.setVocabulary(emptyVocabulary);
      return;
    }
    const vocabulary = loadVocabulary(wordgrainFile);
    llmService.setVocabulary(vocabulary ?? emptyVocabulary);
    reactionService.setVocabulary(vocabulary ?? emptyVocabulary);
  }, [wordgrainFile, llmService, reactionService]);

  useEffect(() => {
    refreshFile();
    hotReload();
  }, [refreshFile, hotReload]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setFile = useCallback(
    (sourcePath: string) => {
      const resolved = path.resolve(sourcePath);
      const result = validateWordgrainFile(resolved);
      if (!result.success) {
        setError(result.error ?? 'Failed to set file');
        return;
      }
      setWordgrainFile(resolved);
      saveConfigFile({ wordgrainFile: resolved });
      setError(null);
      setSubMode('normal');
    },
    [],
  );

  const clearFile = useCallback(() => {
    setWordgrainFile(undefined);
    saveConfigFile({ wordgrainFile: '' });
    setError(null);
    setSelectedIndex(0);
    setSubMode('normal');
  }, []);

  const reloadFile = useCallback(() => {
    refreshFile();
    hotReload();
  }, [refreshFile, hotReload]);

  const toggleFeature = useCallback(
    (key: keyof MumblFeatures) => {
      const updated = { ...features, [key]: !features[key] };
      setFeatures(updated);
      saveConfigFile({ features: updated });
      reactionService.setFeatures(updated);
    },
    [features, reactionService],
  );

  return (
    <ConfigContext.Provider
      value={{
        config,
        file,
        stats,
        selectedIndex,
        setSelectedIndex,
        subMode,
        setSubMode,
        error,
        clearError,
        setFile,
        clearFile,
        reloadFile,
        features,
        toggleFeature,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}
