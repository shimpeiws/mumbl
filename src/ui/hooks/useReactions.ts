import { useCallback, useEffect, useRef, useState } from 'react';
import type { Reaction } from '../../repositories/types.js';
import { useServices } from '../context/ServiceContext.js';

export interface UseReactionsResult {
  reactions: Map<string, Reaction>;
  loading: boolean;
  refetch: (entryIds: string[]) => void;
}

/**
 * Hook to fetch reactions for a list of entries
 * Automatically refreshes when background reaction generation completes
 */
export function useReactions(entryIds: string[]): UseReactionsResult {
  const { reactionService } = useServices();
  const [reactions, setReactions] = useState<Map<string, Reaction>>(new Map());
  const [loading, setLoading] = useState(true);

  // Track entryIds in ref for use in event callback without causing re-subscription
  const entryIdsRef = useRef<string[]>(entryIds);
  useEffect(() => {
    entryIdsRef.current = entryIds;
  }, [entryIds]);

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

  // Subscribe to reactionCreated events for auto-refresh
  useEffect(() => {
    const unsubscribe = reactionService.on('reactionCreated', (reaction: Reaction) => {
      if (entryIdsRef.current.includes(reaction.entryId)) {
        setReactions((prev: Map<string, Reaction>) => new Map(prev).set(reaction.entryId, reaction));
      }
    });

    return unsubscribe;
  }, [reactionService]);

  return {
    reactions,
    loading,
    refetch: fetchReactions,
  };
}
