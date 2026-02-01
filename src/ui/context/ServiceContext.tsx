import React, { createContext, useContext } from 'react';
import type { EntryService } from '../../services/entry-service.js';

interface ServiceContextValue {
  entryService: EntryService;
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
  children: React.ReactNode;
}

export function ServiceProvider({ entryService, children }: ServiceProviderProps) {
  return <ServiceContext.Provider value={{ entryService }}>{children}</ServiceContext.Provider>;
}
