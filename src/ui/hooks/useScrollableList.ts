import { useRef } from 'react';

export interface UseScrollableListOptions {
  totalItems: number;
  selectedIndex: number;
  viewportHeight: number;
  itemHeight?: number;
}

export interface UseScrollableListResult {
  scrollOffset: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  hasItemsAbove: boolean;
  hasItemsBelow: boolean;
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
  const { totalItems, selectedIndex, viewportHeight, itemHeight = 1 } = options;
  const scrollOffsetRef = useRef(0);

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
