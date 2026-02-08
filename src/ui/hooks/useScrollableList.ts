import { useRef } from 'react';

export interface UseScrollableListOptions {
  totalItems: number;
  selectedIndex: number;
  viewportHeight: number;
  /** Array of heights for each item. If provided, itemHeight is ignored. */
  itemHeights?: number[];
  /** Default height for all items when itemHeights is not provided */
  itemHeight?: number;
}

export interface UseScrollableListResult {
  scrollOffset: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  hasItemsAbove: boolean;
  hasItemsBelow: boolean;
}

/**
 * Find the start index that fits within viewport starting from a given scroll position
 */
function findVisibleRange(
  itemHeights: number[],
  scrollOffset: number,
  viewportHeight: number,
): { startIndex: number; endIndex: number } {
  if (itemHeights.length === 0) {
    return { startIndex: 0, endIndex: -1 };
  }

  // Find start index based on scroll offset
  let startIndex = 0;

  // Skip items above the scroll offset
  for (let i = 0; i < scrollOffset && i < itemHeights.length; i++) {
    startIndex = i + 1;
  }

  // Find end index that fits within viewport
  let visibleHeight = 0;
  let endIndex = startIndex;

  for (let i = startIndex; i < itemHeights.length; i++) {
    const height = itemHeights[i] ?? 1;
    if (visibleHeight + height > viewportHeight) {
      break;
    }
    visibleHeight += height;
    endIndex = i;
  }

  return { startIndex, endIndex };
}

/**
 * Calculate scroll offset to ensure selected item is visible
 */
function calculateScrollOffsetVariable(
  selectedIndex: number,
  currentOffset: number,
  itemHeights: number[],
  viewportHeight: number,
): number {
  if (itemHeights.length === 0) {
    return 0;
  }

  // Clamp selected index
  const clampedIndex = Math.max(0, Math.min(selectedIndex, itemHeights.length - 1));

  // If selected item is above visible area, scroll up to show it
  if (clampedIndex < currentOffset) {
    return clampedIndex;
  }

  // Calculate visible range from current offset
  const { endIndex } = findVisibleRange(itemHeights, currentOffset, viewportHeight);

  // If selected item is below visible area, scroll down
  if (clampedIndex > endIndex) {
    // Find new offset that makes selected item visible at the bottom
    const selectedHeight = itemHeights[clampedIndex] ?? 1;
    let heightSum = selectedHeight;
    let newOffset = clampedIndex;

    for (let i = clampedIndex - 1; i >= 0; i--) {
      const height = itemHeights[i] ?? 1;
      if (heightSum + height > viewportHeight) {
        break;
      }
      heightSum += height;
      newOffset = i;
    }

    return newOffset;
  }

  return currentOffset;
}

function calculateScrollOffset(
  selectedIndex: number,
  currentOffset: number,
  visibleCount: number,
  totalItems: number,
): number {
  if (totalItems === 0) {
    return 0;
  }

  // If selected item is above visible area, scroll up
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  // If selected item is below visible area, scroll down
  const visibleEndIndex = currentOffset + visibleCount - 1;
  if (selectedIndex > visibleEndIndex) {
    return selectedIndex - visibleCount + 1;
  }

  return currentOffset;
}

export function useScrollableList(options: UseScrollableListOptions): UseScrollableListResult {
  const { totalItems, selectedIndex, viewportHeight, itemHeights, itemHeight = 1 } = options;
  const scrollOffsetRef = useRef(0);

  // Use variable height calculation if itemHeights is provided
  if (itemHeights && itemHeights.length > 0) {
    scrollOffsetRef.current = calculateScrollOffsetVariable(
      selectedIndex,
      scrollOffsetRef.current,
      itemHeights,
      viewportHeight,
    );

    const scrollOffset = scrollOffsetRef.current;
    const { startIndex, endIndex } = findVisibleRange(itemHeights, scrollOffset, viewportHeight);

    const hasItemsAbove = scrollOffset > 0;
    const hasItemsBelow = endIndex < itemHeights.length - 1;

    return {
      scrollOffset,
      visibleStartIndex: startIndex,
      visibleEndIndex: endIndex,
      hasItemsAbove,
      hasItemsBelow,
    };
  }

  // Fall back to fixed height calculation
  const visibleCount = Math.floor(viewportHeight / itemHeight);

  // Calculate scroll offset synchronously on each render
  scrollOffsetRef.current = calculateScrollOffset(
    selectedIndex,
    scrollOffsetRef.current,
    visibleCount,
    totalItems,
  );

  const scrollOffset = scrollOffsetRef.current;

  const visibleStartIndex = scrollOffset;
  const visibleEndIndex = Math.min(scrollOffset + visibleCount - 1, totalItems - 1);
  const hasItemsAbove = scrollOffset > 0;
  const hasItemsBelow = visibleEndIndex < totalItems - 1;

  return {
    scrollOffset,
    visibleStartIndex,
    visibleEndIndex,
    hasItemsAbove,
    hasItemsBelow,
  };
}
