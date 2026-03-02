import { useInput } from 'ink';
import { useCallback, useRef, useState } from 'react';

export interface UseKeyboardNavigationOptions {
  itemCount: number;
  enabled?: boolean;
  initialIndex?: number;
  onSelect?: (index: number) => void;
  onAction?: () => void;
  onEscape?: () => void;
}

export interface UseKeyboardNavigationResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions,
): UseKeyboardNavigationResult {
  const { itemCount, enabled = true, initialIndex = 0, onSelect, onAction, onEscape } = options;
  const [selectedIndex, setSelectedIndexState] = useState(initialIndex);
  const selectedIndexRef = useRef(initialIndex);

  const updateSelectedIndex = useCallback((index: number) => {
    selectedIndexRef.current = index;
    setSelectedIndexState(index);
  }, []);

  const moveUp = useCallback(() => {
    if (itemCount === 0) return;
    const prev = selectedIndexRef.current;
    const newIndex = prev > 0 ? prev - 1 : prev;
    updateSelectedIndex(newIndex);
    onSelect?.(newIndex);
  }, [itemCount, onSelect, updateSelectedIndex]);

  const moveDown = useCallback(() => {
    if (itemCount === 0) return;
    const prev = selectedIndexRef.current;
    const newIndex = prev < itemCount - 1 ? prev + 1 : prev;
    updateSelectedIndex(newIndex);
    onSelect?.(newIndex);
  }, [itemCount, onSelect, updateSelectedIndex]);

  useInput(
    (input, key) => {
      // Navigation: j/k or arrow keys
      if (input === 'k' || key.upArrow) {
        moveUp();
        return;
      }
      if (input === 'j' || key.downArrow) {
        moveDown();
        return;
      }

      // Action on Enter
      if (key.return) {
        onAction?.();
        return;
      }

      // Escape
      if (key.escape) {
        onEscape?.();
        return;
      }
    },
    { isActive: enabled },
  );

  return {
    selectedIndex,
    setSelectedIndex: updateSelectedIndex,
  };
}
