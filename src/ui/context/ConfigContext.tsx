import * as path from 'node:path';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { saveConfigFile } from '../../config/config-file.js';
import type { ResolvedConfig } from '../../config/types.js';
import {
  type WordgrainFileInfo,
  type WordgrainStats,
  getWordgrainStats,
  listWordgrainFiles,
  loadVocabulary,
  registerWordgrainFile,
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

const emptyVocabulary: VocabularySet = {
  words: [],
  phrases: [],
  tags: [],
  source: '',
  richWords: [],
};

export function ConfigProvider({ config, children }: ConfigProviderProps) {
  const { llmService, reactionService } = useServices();
  const [wordgrainFiles, setWordgrainFiles] = useState<string[]>(config.wordgrainFiles ?? []);
  const [files, setFiles] = useState<WordgrainFileInfo[]>([]);
  const [stats, setStats] = useState<WordgrainStats>(emptyStats);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [subMode, setSubMode] = useState<ConfigSubMode>('normal');
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(() => {
    if (wordgrainFiles.length === 0) {
      setFiles([]);
      setStats(emptyStats);
      return;
    }
    setFiles(listWordgrainFiles(wordgrainFiles));
    setStats(getWordgrainStats(wordgrainFiles));
  }, [wordgrainFiles]);

  const hotReload = useCallback(() => {
    if (wordgrainFiles.length === 0) {
      llmService.setVocabulary(emptyVocabulary);
      reactionService.setVocabulary(emptyVocabulary);
      return;
    }
    const vocabulary = loadVocabulary(wordgrainFiles);
    llmService.setVocabulary(vocabulary ?? emptyVocabulary);
    reactionService.setVocabulary(vocabulary ?? emptyVocabulary);
  }, [wordgrainFiles, llmService, reactionService]);

  useEffect(() => {
    refreshFiles();
    hotReload();
  }, [refreshFiles, hotReload]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addFile = useCallback(
    (sourcePath: string) => {
      const resolved = path.resolve(sourcePath);
      const result = registerWordgrainFile(resolved, wordgrainFiles);
      if (!result.success) {
        setError(result.error ?? 'Failed to add file');
        return;
      }
      const updated = [...wordgrainFiles, resolved];
      setWordgrainFiles(updated);
      saveConfigFile({ wordgrainFiles: updated });
      setError(null);
      setSubMode('normal');
    },
    [wordgrainFiles],
  );

  const removeFile = useCallback(
    (filename: string) => {
      const updated = wordgrainFiles.filter((fp) => path.basename(fp) !== filename);
      setWordgrainFiles(updated);
      saveConfigFile({ wordgrainFiles: updated });
      setError(null);
      setSelectedFileIndex((prev) => Math.max(0, prev - 1));
      setSubMode('normal');
    },
    [wordgrainFiles],
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
