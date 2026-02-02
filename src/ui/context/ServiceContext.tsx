import React, { createContext, useContext } from 'react';
import type { EntryService } from '../../services/entry-service.js';
import type { OllamaService } from '../../services/ollama-service.js';

interface ServiceContextValue {
  entryService: EntryService;
  ollamaService: OllamaService;
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
  children: React.ReactNode;
}

export function ServiceProvider({ entryService, ollamaService, children }: ServiceProviderProps) {
  return (
    <ServiceContext.Provider value={{ entryService, ollamaService }}>
      {children}
    </ServiceContext.Provider>
  );
}
