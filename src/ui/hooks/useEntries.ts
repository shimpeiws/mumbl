import { useCallback, useEffect, useState } from 'react';
import type { JournalEntry, ListEntriesOptions } from '../../repositories/types.js';
import { useServices } from '../context/ServiceContext.js';

export interface UseEntriesOptions {
  limit?: number;
  sortBy?: 'timestamp' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export interface UseEntriesResult {
  entries: JournalEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEntries(options: UseEntriesOptions = {}): UseEntriesResult {
  const { entryService } = useServices();

  const buildListOptions = useCallback(
    (): ListEntriesOptions => ({
      limit: options.limit,
      sortBy: options.sortBy ?? 'timestamp',
      order: options.order ?? 'desc',
    }),
    [options.limit, options.sortBy, options.order],
  );

  // Initialize entries synchronously to avoid a "Loading entries..." flash
  // on every mount. entryService.list() is synchronous (SQLite), so we can
  // populate data immediately without a loading state.
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      return entryService.list(buildListOptions());
    } catch {
      return [];
    }
  });
  const [error, setError] = useState<Error | null>(null);

  const fetchEntries = useCallback(() => {
    setError(null);

    try {
      const result = entryService.list(buildListOptions());
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch entries'));
    }
  }, [entryService, buildListOptions]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading: false,
    error,
    refetch: fetchEntries,
  };
}
