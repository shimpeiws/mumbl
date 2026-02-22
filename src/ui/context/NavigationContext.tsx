import React, { createContext, useCallback, useContext, useState } from 'react';

export type AppMode = 'list' | 'write' | 'conversation' | 'config';

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
  switchToConversation: (conversationId?: string) => void;
  switchToConfig: () => void;
  toggleMode: () => void;
  listState: ListState;
  setListState: (state: ListState) => void;
  writeState: WriteState;
  setWriteState: (state: WriteState) => void;
  conversationId: string | null;
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
  const [conversationId, setConversationId] = useState<string | null>(null);

  const switchToList = useCallback((options?: SwitchToListOptions) => {
    if (options?.selectLastEntry) {
      setListState({ selectedIndex: -1 });
    }
    setMode('list');
  }, []);

  const switchToWrite = useCallback(() => {
    setMode('write');
  }, []);

  const switchToConversation = useCallback((id?: string) => {
    setConversationId(id ?? null);
    setMode('conversation');
  }, []);

  const switchToConfig = useCallback(() => {
    setMode('config');
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
        switchToConversation,
        switchToConfig,
        toggleMode,
        listState,
        setListState,
        writeState,
        setWriteState,
        conversationId,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
