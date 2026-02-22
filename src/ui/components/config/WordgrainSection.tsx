import { Box, Text } from 'ink';
import React from 'react';
import { useConfig } from '../../context/ConfigContext.js';

export function WordgrainSection() {
  const { config, files, stats, selectedFileIndex } = useConfig();

  if (!config.wordgrainDir) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="yellow">
            Wordgrain Files
          </Text>
        </Box>
        <Box paddingLeft={2}>
          <Text dimColor>Set MUMBL_WORDGRAIN_DIR to enable wordgrain vocabulary.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Wordgrain Files
        </Text>
        <Text dimColor> ({config.wordgrainDir})</Text>
      </Box>

      {files.length === 0 ? (
        <Box paddingLeft={2}>
          <Text dimColor>No wordgrain files found.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" paddingLeft={2}>
          {files.map((file, index) => (
            <Text key={file.filename}>
              <Text color={index === selectedFileIndex ? 'cyan' : undefined}>
                {index === selectedFileIndex ? '> ' : '  '}
              </Text>
              <Text bold={index === selectedFileIndex}>{file.name}</Text>
              <Text dimColor>
                {' '}
                ({file.filename}, {file.grainCount} grains)
              </Text>
            </Text>
          ))}
        </Box>
      )}

      {files.length > 0 && (
        <Box marginTop={1} paddingLeft={2}>
          <Text dimColor>
            Total: {stats.totalFiles} files, {stats.totalGrains} grains ({stats.wordCount} words,{' '}
            {stats.phraseCount} phrases, {stats.tagCount} tags)
          </Text>
        </Box>
      )}
    </Box>
  );
}
