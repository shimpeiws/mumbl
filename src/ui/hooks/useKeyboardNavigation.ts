import { useInput } from 'ink';
import { useCallback, useState } from 'react';

export interface UseKeyboardNavigationOptions {
  itemCount: number;
  enabled?: boolean;
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
  const { itemCount, enabled = true, onSelect, onAction, onEscape } = options;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const moveUp = useCallback(() => {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : prev;
      onSelect?.(newIndex);
      return newIndex;
    });
  }, [itemCount, onSelect]);

  const moveDown = useCallback(() => {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => {
      const newIndex = prev < itemCount - 1 ? prev + 1 : prev;
      onSelect?.(newIndex);
      return newIndex;
    });
  }, [itemCount, onSelect]);

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
    setSelectedIndex,
  };
}
