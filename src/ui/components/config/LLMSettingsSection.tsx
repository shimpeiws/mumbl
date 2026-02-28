import { Box, Text } from 'ink';
import React from 'react';
import { useConfig } from '../../context/ConfigContext.js';
import { useServices } from '../../context/ServiceContext.js';

export function LLMSettingsSection() {
  const { config } = useConfig();
  const { llmService } = useServices();
  const providerInfo = llmService.getProviderInfo();

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">
          LLM Settings
        </Text>
      </Box>
      <Box flexDirection="column" paddingLeft={2}>
        <Text>
          <Text dimColor>Provider: </Text>
          <Text>{providerInfo.provider}</Text>
        </Text>
        <Text>
          <Text dimColor>Model: </Text>
          <Text>{providerInfo.model}</Text>
        </Text>
        <Text>
          <Text dimColor>Base URL: </Text>
          <Text>{config.baseUrl ?? '(default)'}</Text>
        </Text>
      </Box>
    </Box>
  );
}
