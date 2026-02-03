import { Box, Text } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import type { JournalEntry } from '../../../repositories/types.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useEntries } from '../../hooks/useEntries.js';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation.js';
import { useReactions } from '../../hooks/useReactions.js';
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

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: entryItems.length,
    enabled: !viewingEntry,
    initialIndex: listState.selectedIndex,
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

  // Map flat list index to selected entry
  const selectedEntryId = entryItems[selectedIndex]?.entry?.id;

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
      </Box>

      <Box flexDirection="column">
        {flatList.map((item) => {
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
