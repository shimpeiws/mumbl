import { Box, Text, useInput } from 'ink';
import React, { useMemo, useState } from 'react';
import type { JournalEntry } from '../../../repositories/types.js';
import { useServices } from '../../context/ServiceContext.js';
import { useReactions } from '../../hooks/useReactions.js';
import { formatFullDate } from '../../utils/date-formatter.js';
import { formatReactionDisplay } from './EntryListItem.js';

interface EntryDetailProps {
  entry: JournalEntry;
  onClose: () => void;
  onDelete?: () => void;
}

export function EntryDetail({ entry, onClose, onDelete }: EntryDetailProps) {
  const { entryService } = useServices();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useInput((input, key) => {
    if (confirmingDelete) {
      if (input === 'y') {
        entryService.delete(entry.id);
        onDelete?.();
        return;
      }
      if (input === 'n' || key.escape) {
        setConfirmingDelete(false);
        return;
      }
      return;
    }

    if (input === 'd') {
      setConfirmingDelete(true);
      return;
    }

    if (key.escape || input === 'q') {
      onClose();
    }
  });

  const entryIds = useMemo(() => [entry.id], [entry.id]);
  const { reactions } = useReactions(entryIds);
  const reaction = reactions.get(entry.id);

  const metadata = entry.metadata;
  const hasTags = metadata.tags && metadata.tags.length > 0;
  const hasMood = metadata.mood;
  const hasLocation = metadata.location;
  const hasMetadata = hasTags || hasMood || hasLocation;

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            {formatFullDate(entry.timestamp)}
          </Text>
        </Box>

        <Box marginBottom={1} flexDirection="column">
          <Text>{entry.content}</Text>
        </Box>

        {reaction && (
          <Box marginBottom={1}>
            <Text dimColor>{formatReactionDisplay(reaction)}</Text>
          </Box>
        )}

        {hasMetadata && (
          <Box
            flexDirection="column"
            marginTop={1}
            borderStyle="single"
            borderTop
            borderBottom={false}
            borderLeft={false}
            borderRight={false}
          >
            <Box marginTop={1}>
              {hasTags && (
                <Box marginRight={2}>
                  <Text dimColor>Tags: </Text>
                  <Text color="blue">{metadata.tags?.map((t) => `#${t}`).join(' ')}</Text>
                </Box>
              )}
              {hasMood && (
                <Box marginRight={2}>
                  <Text dimColor>Mood: </Text>
                  <Text>{metadata.mood}</Text>
                </Box>
              )}
              {hasLocation && (
                <Box>
                  <Text dimColor>Location: </Text>
                  <Text>{metadata.location}</Text>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {confirmingDelete ? (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text bold color="red">
            Delete this entry?
          </Text>
          <Box marginTop={1}>
            <Text dimColor>y: confirm | n/Esc: cancel</Text>
          </Box>
        </Box>
      ) : (
        <Box marginTop={1} justifyContent="center">
          <Text dimColor>Esc/q: back | d: delete</Text>
        </Box>
      )}
    </Box>
  );
}
