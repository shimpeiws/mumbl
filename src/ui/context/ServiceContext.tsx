import React, { createContext, useContext } from 'react';
import type { ContextServiceInterface } from '../../services/context/types.js';
import type { EntryServiceInterface } from '../../services/entry-service.js';
import type { FollowUpServiceInterface } from '../../services/follow-up/follow-up-service.js';
import type { LLMServiceInterface } from '../../services/llm/llm-service.js';
import type { OllamaService } from '../../services/ollama-service.js';
import type { QueueServiceInterface } from '../../services/queue/index.js';
import type { ReactionServiceInterface } from '../../services/reaction-service.js';
import type { TrendServiceInterface } from '../../services/trends/types.js';

interface ServiceContextValue {
  entryService: EntryServiceInterface;
  ollamaService: OllamaService;
  llmService: LLMServiceInterface;
  reactionService: ReactionServiceInterface;
  queueService: QueueServiceInterface;
  trendService?: TrendServiceInterface;
  contextService?: ContextServiceInterface;
  followUpService?: FollowUpServiceInterface;
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
  entryService: EntryServiceInterface;
  ollamaService: OllamaService;
  llmService: LLMServiceInterface;
  reactionService: ReactionServiceInterface;
  queueService: QueueServiceInterface;
  trendService?: TrendServiceInterface;
  contextService?: ContextServiceInterface;
  followUpService?: FollowUpServiceInterface;
  children: React.ReactNode;
}

export function ServiceProvider({
  entryService,
  ollamaService,
  llmService,
  reactionService,
  queueService,
  trendService,
  contextService,
  followUpService,
  children,
}: ServiceProviderProps) {
  return (
    <ServiceContext.Provider
      value={{
        entryService,
        ollamaService,
        llmService,
        reactionService,
        queueService,
        trendService,
        contextService,
        followUpService,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}
