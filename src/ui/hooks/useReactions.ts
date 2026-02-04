import { useCallback, useEffect, useState } from 'react';
import type { Reaction } from '../../repositories/types.js';
import { useServices } from '../context/ServiceContext.js';

export interface UseReactionsResult {
  reactions: Map<string, Reaction>;
  loading: boolean;
  refetch: (entryIds: string[]) => void;
}

/**
 * Hook to fetch reactions for a list of entries
 */
export function useReactions(entryIds: string[]): UseReactionsResult {
  const { reactionService } = useServices();
  const [reactions, setReactions] = useState<Map<string, Reaction>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchReactions = useCallback(
    (ids: string[]) => {
      setLoading(true);
      try {
        const reactionMap = reactionService.getReactionsForEntries(ids);
        setReactions(reactionMap);
      } finally {
        setLoading(false);
      }
    },
    [reactionService],
  );

  useEffect(() => {
    if (entryIds.length > 0) {
      fetchReactions(entryIds);
    } else {
      setReactions(new Map());
      setLoading(false);
    }
  }, [entryIds, fetchReactions]);

  return {
    reactions,
    loading,
    refetch: fetchReactions,
  };
}
