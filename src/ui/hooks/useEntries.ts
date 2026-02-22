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
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const listOptions: ListEntriesOptions = {
        limit: options.limit,
        sortBy: options.sortBy ?? 'timestamp',
        order: options.order ?? 'desc',
      };

      const result = entryService.list(listOptions);
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch entries'));
    } finally {
      setLoading(false);
    }
  }, [entryService, options.limit, options.sortBy, options.order]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
  };
}
