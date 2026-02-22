import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ResolvedConfig } from '../../config/types.js';
import {
  type WordgrainFileInfo,
  type WordgrainStats,
  addWordgrainFile,
  getWordgrainStats,
  listWordgrainFiles,
  loadVocabulary,
  removeWordgrainFile,
} from '../../services/wordgrain/index.js';
import type { VocabularySet } from '../../services/wordgrain/types.js';
import { useServices } from './ServiceContext.js';

export type ConfigSubMode = 'normal' | 'add-file' | 'delete-confirm';

interface ConfigContextValue {
  config: ResolvedConfig;
  files: WordgrainFileInfo[];
  stats: WordgrainStats;
  selectedFileIndex: number;
  setSelectedFileIndex: (index: number) => void;
  subMode: ConfigSubMode;
  setSubMode: (mode: ConfigSubMode) => void;
  error: string | null;
  clearError: () => void;
  addFile: (sourcePath: string) => void;
  removeFile: (filename: string) => void;
  reloadFiles: () => void;
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
  totalFiles: 0,
  totalGrains: 0,
  wordCount: 0,
  phraseCount: 0,
  tagCount: 0,
};

const emptyVocabulary: VocabularySet = { words: [], phrases: [], tags: [], source: '' };

export function ConfigProvider({ config, children }: ConfigProviderProps) {
  const { llmService, reactionService } = useServices();
  const [files, setFiles] = useState<WordgrainFileInfo[]>([]);
  const [stats, setStats] = useState<WordgrainStats>(emptyStats);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [subMode, setSubMode] = useState<ConfigSubMode>('normal');
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(() => {
    if (!config.wordgrainDir) {
      setFiles([]);
      setStats(emptyStats);
      return;
    }
    setFiles(listWordgrainFiles(config.wordgrainDir));
    setStats(getWordgrainStats(config.wordgrainDir));
  }, [config.wordgrainDir]);

  const hotReload = useCallback(() => {
    if (!config.wordgrainDir) return;
    const vocabulary = loadVocabulary(config.wordgrainDir);
    llmService.setVocabulary(vocabulary ?? emptyVocabulary);
    reactionService.setVocabulary(vocabulary ?? emptyVocabulary);
  }, [config.wordgrainDir, llmService, reactionService]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addFile = useCallback(
    (sourcePath: string) => {
      if (!config.wordgrainDir) {
        setError('Wordgrain directory is not configured');
        return;
      }
      const result = addWordgrainFile(sourcePath, config.wordgrainDir);
      if (!result.success) {
        setError(result.error ?? 'Failed to add file');
        return;
      }
      setError(null);
      refreshFiles();
      hotReload();
      setSubMode('normal');
    },
    [config.wordgrainDir, refreshFiles, hotReload],
  );

  const removeFile = useCallback(
    (filename: string) => {
      if (!config.wordgrainDir) {
        setError('Wordgrain directory is not configured');
        return;
      }
      const result = removeWordgrainFile(filename, config.wordgrainDir);
      if (!result.success) {
        setError(result.error ?? 'Failed to remove file');
        return;
      }
      setError(null);
      setSelectedFileIndex((prev) => Math.max(0, prev - 1));
      refreshFiles();
      hotReload();
      setSubMode('normal');
    },
    [config.wordgrainDir, refreshFiles, hotReload],
  );

  const reloadFiles = useCallback(() => {
    refreshFiles();
    hotReload();
  }, [refreshFiles, hotReload]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        files,
        stats,
        selectedFileIndex,
        setSelectedFileIndex,
        subMode,
        setSubMode,
        error,
        clearError,
        addFile,
        removeFile,
        reloadFiles,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}
