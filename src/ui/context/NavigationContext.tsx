import React, { createContext, useCallback, useContext, useState } from 'react';

export type AppMode = 'list' | 'write';

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

export function NavigationProvider({ children, initialMode = 'list' }: NavigationProviderProps) {
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

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'list' ? 'write' : 'list'));
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        mode,
        switchToList,
        switchToWrite,
        toggleMode,
        listState,
        setListState,
        writeState,
        setWriteState,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
