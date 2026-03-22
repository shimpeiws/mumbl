import { Box, Text } from 'ink';
import React from 'react';
import { useConfig } from '../../context/ConfigContext.js';

export function WordgrainSection() {
  const { file, stats, selectedIndex } = useConfig();
  const isSelected = selectedIndex === 0;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Wordgrain File
        </Text>
      </Box>

      {!file ? (
        <Box paddingLeft={2}>
          <Text dimColor>No wordgrain file set. Press &apos;a&apos; to set.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" paddingLeft={2}>
          <Text>
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '> ' : '  '}</Text>
            <Text bold={isSelected}>{file.name}</Text>
            <Text dimColor>
              {' '}
              ({file.filename},{' '}
              {file.grainCount > 0 && file.barCount > 0
                ? `${file.grainCount} grains, ${file.barCount} bars`
                : file.barCount > 0
                  ? `${file.barCount} bars`
                  : `${file.grainCount} grains`}
              )
            </Text>
          </Text>

          <Box marginTop={1} paddingLeft={2}>
            <Text dimColor>
              {stats.totalGrains} grains ({stats.wordCount} words, {stats.phraseCount} phrases,{' '}
              {stats.tagCount} tags)
              {stats.barCount > 0 ? `, ${stats.barCount} bars` : ''}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
