import { Box, Text } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import type { JournalEntry } from '../../../repositories/types.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useEntries } from '../../hooks/useEntries.js';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation.js';
import { useReactions } from '../../hooks/useReactions.js';
import { useScrollableList } from '../../hooks/useScrollableList.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { groupEntriesByDate } from '../../utils/date-formatter.js';
import { EmptyState } from './EmptyState.js';
import { EntryDetail } from './EntryDetail.js';
import { EntryGroupHeader } from './EntryGroupHeader.js';
import { EntryListItem } from './EntryListItem.js';

interface HeaderItem {
  type: 'header';
  key: string;
  group: string;
  entryCount: number;
}

interface EntryItem {
  type: 'entry';
  key: string;
  entry: JournalEntry;
}

type FlatListItem = HeaderItem | EntryItem;

interface EntryListProps {
  onViewingDetailChange?: (isViewing: boolean) => void;
}

export function EntryList({ onViewingDetailChange }: EntryListProps) {
  const { entries, loading, error } = useEntries();
  const { listState, setListState } = useNavigation();
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  // Get entry IDs for fetching reactions
  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const { reactions } = useReactions(entryIds);

  // Notify parent when viewing detail changes
  useEffect(() => {
    onViewingDetailChange?.(viewingEntry !== null);
  }, [viewingEntry, onViewingDetailChange]);

  // Group entries by date and flatten for rendering
  const flatList = useMemo(() => {
    const grouped = groupEntriesByDate(entries);
    const items: FlatListItem[] = [];

    for (const group of grouped) {
      items.push({
        type: 'header',
        key: `header-${group.group}`,
        group: group.label,
        entryCount: group.entries.length,
      });

      for (const entry of group.entries) {
        items.push({
          type: 'entry',
          key: `entry-${entry.id}`,
          entry,
        });
      }
    }

    return items;
  }, [entries]);

  // Get only entry items for navigation
  const entryItems = useMemo(
    () => flatList.filter((item): item is EntryItem => item.type === 'entry'),
    [flatList],
  );

  // Resolve -1 sentinel to last entry index
  const resolvedInitialIndex =
    listState.selectedIndex === -1 && entryItems.length > 0 ? 0 : listState.selectedIndex;

  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
    itemCount: entryItems.length,
    enabled: !viewingEntry,
    initialIndex: resolvedInitialIndex,
    onAction: () => {
      const selectedEntry = entryItems[selectedIndex]?.entry;
      if (selectedEntry) {
        setViewingEntry(selectedEntry);
      }
    },
    onIndexChange: (index) => {
      setListState({ selectedIndex: index });
    },
  });

  // When entries load and sentinel was set, update to last entry
  useEffect(() => {
    if (listState.selectedIndex === -1 && entryItems.length > 0) {
      setSelectedIndex(0);
      setListState({ selectedIndex: 0 });
    }
  }, [listState.selectedIndex, entryItems.length, setSelectedIndex, setListState]);

  // Map flat list index to selected entry
  const selectedEntryId = entryItems[selectedIndex]?.entry?.id;

  // Find the flatList index of the selected entry for scrolling
  const selectedFlatIndex = useMemo(() => {
    if (!selectedEntryId) return 0;
    return flatList.findIndex((item) => item.type === 'entry' && item.entry.id === selectedEntryId);
  }, [flatList, selectedEntryId]);

  // Get terminal size for viewport calculation
  const { rows: terminalRows } = useTerminalSize();

  // Calculate viewport height: terminal rows - header (2 lines) - padding (2 lines) - footer reserve (3 lines)
  const viewportHeight = Math.max(5, terminalRows - 7);

  // Calculate item heights: entries with reactions = 2 lines, headers = 3 lines, entries without reactions = 1 line
  const itemHeights = useMemo(() => {
    return flatList.map((item) => {
      if (item.type === 'header') {
        return 3; // 1 line content + marginY={1} (1 above + 1 below)
      }
      // Entry with reaction takes 2 lines, without reaction takes 1 line
      return reactions.has(item.entry.id) ? 2 : 1;
    });
  }, [flatList, reactions]);

  // Use scrollable list hook for scroll management with variable item heights
  const { visibleStartIndex, visibleEndIndex, hasItemsAbove, hasItemsBelow } = useScrollableList({
    totalItems: flatList.length,
    selectedIndex: selectedFlatIndex,
    viewportHeight,
    itemHeights,
  });

  // Slice the flatList for visible items
  const visibleItems = useMemo(() => {
    return flatList.slice(visibleStartIndex, visibleEndIndex + 1);
  }, [flatList, visibleStartIndex, visibleEndIndex]);

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading entries...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error.message}</Text>
      </Box>
    );
  }

  if (viewingEntry) {
    return <EntryDetail entry={viewingEntry} onClose={() => setViewingEntry(null)} />;
  }

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Journal Entries
        </Text>
        <Text dimColor> ({entries.length} total)</Text>
        {(hasItemsAbove || hasItemsBelow) && (
          <Text dimColor>
            {' '}
            {hasItemsAbove ? '▲' : ' '}
            {hasItemsBelow ? '▼' : ' '}
          </Text>
        )}
      </Box>

      <Box flexDirection="column" height={viewportHeight} overflow="hidden">
        {visibleItems.map((item) => {
          if (item.type === 'header') {
            return (
              <EntryGroupHeader
                key={item.key}
                groupName={item.group}
                entryCount={item.entryCount}
              />
            );
          }

          return (
            <EntryListItem
              key={item.key}
              entry={item.entry}
              isSelected={item.entry.id === selectedEntryId}
              reaction={reactions.get(item.entry.id)}
            />
          );
        })}
      </Box>
    </Box>
  );
}
