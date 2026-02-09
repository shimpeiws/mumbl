import { useCallback, useEffect, useState } from 'react';
import type { WaitDisplayService, WaitDisplayState } from '../../services/wait-display/index.js';

/**
 * Hook to use the wait display service in React components
 */
export function useWaitDisplay(service: WaitDisplayService | null) {
  const [state, setState] = useState<WaitDisplayState>({
    isShowing: false,
    elapsedMs: 0,
  });

  useEffect(() => {
    if (!service) {
      return;
    }

    // Subscribe to state changes
    const unsubscribe = service.on('stateChange', (newState) => {
      setState(newState);
    });

    // Initialize with current state
    setState(service.getState());

    return () => {
      unsubscribe();
    };
  }, [service]);

  const dismiss = useCallback(() => {
    if (service) {
      service.stop();
    }
  }, [service]);

  return {
    isShowing: state.isShowing,
    elapsedMs: state.elapsedMs,
    startTime: state.startTime,
    dismiss,
  };
}
