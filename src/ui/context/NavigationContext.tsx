import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AppMode = 'list' | 'write' | 'config';

interface ListState {
  selectedIndex: number;
}

interface WriteState {
  content: string;
}

interface SwitchToListOptions {
  selectLastEntry?: boolean;
}

interface NavigationContextValue {
  mode: AppMode;
  switchToList: (options?: SwitchToListOptions) => void;
  switchToWrite: () => void;
  switchToConfig: () => void;
  toggleMode: () => void;
  listState: ListState;
  setListState: (state: ListState) => void;
  writeState: WriteState;
  setWriteState: (state: WriteState) => void;
}

export const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: React.ReactNode;
  initialMode?: AppMode;
}

export function NavigationProvider({ children, initialMode = 'write' }: NavigationProviderProps) {
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [listState, setListState] = useState<ListState>({ selectedIndex: 0 });
  const [writeState, setWriteState] = useState<WriteState>({ content: '' });
  const switchToList = useCallback((options?: SwitchToListOptions) => {
    if (options?.selectLastEntry) {
      setListState({ selectedIndex: -1 });
    }
    setMode('list');
  }, []);

  const switchToWrite = useCallback(() => {
    setMode('write');
  }, []);

  const switchToConfig = useCallback(() => {
    setMode('config');
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'list' ? 'write' : 'list'));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      switchToList,
      switchToWrite,
      switchToConfig,
      toggleMode,
      listState,
      setListState,
      writeState,
      setWriteState,
    }),
    [mode, switchToList, switchToWrite, switchToConfig, toggleMode, listState, writeState],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
