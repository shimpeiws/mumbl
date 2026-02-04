import React, { createContext, useContext } from 'react';
import type { EntryService } from '../../services/entry-service.js';
import type { LLMService } from '../../services/llm/llm-service.js';
import type { OllamaService } from '../../services/ollama-service.js';
import type { ReactionService } from '../../services/reaction-service.js';

interface ServiceContextValue {
  entryService: EntryService;
  ollamaService: OllamaService;
  llmService: LLMService;
  reactionService: ReactionService;
}

export const ServiceContext = createContext<ServiceContextValue | null>(null);

export function useServices(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within ServiceProvider');
  }
  return context;
}

interface ServiceProviderProps {
  entryService: EntryService;
  ollamaService: OllamaService;
  llmService: LLMService;
  reactionService: ReactionService;
  children: React.ReactNode;
}

export function ServiceProvider({
  entryService,
  ollamaService,
  llmService,
  reactionService,
  children,
}: ServiceProviderProps) {
  return (
    <ServiceContext.Provider value={{ entryService, ollamaService, llmService, reactionService }}>
      {children}
    </ServiceContext.Provider>
  );
}
