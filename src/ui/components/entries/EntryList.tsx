import { Box, Text } from 'ink';
import React, { useMemo, useState } from 'react';
import type { JournalEntry } from '../../../repositories/types.js';
import { useEntries } from '../../hooks/useEntries.js';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation.js';
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

export function EntryList() {
  const { entries, loading, error } = useEntries();
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

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
    onAction: () => {
      const selectedEntry = entryItems[selectedIndex]?.entry;
      if (selectedEntry) {
        setViewingEntry(selectedEntry);
      }
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
            />
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Use j/k or arrows to navigate, Enter to view, q to quit</Text>
      </Box>
    </Box>
  );
}
