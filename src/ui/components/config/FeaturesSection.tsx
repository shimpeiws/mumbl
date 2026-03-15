import { Box, Text } from 'ink';
import React from 'react';
import type { MumblFeatures } from '../../../config/types.js';
import { useConfig } from '../../context/ConfigContext.js';

const FEATURE_LABELS: Record<keyof MumblFeatures, string> = {
  barQuote: 'Bar Quote',
};

const FEATURE_KEYS: (keyof MumblFeatures)[] = ['barQuote'];

interface FeaturesSectionProps {
  isActive: boolean;
  selectedIndex: number;
}

export function FeaturesSection({ isActive, selectedIndex }: FeaturesSectionProps) {
  const { features } = useConfig();

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Features
        </Text>
      </Box>

      <Box flexDirection="column" paddingLeft={2}>
        {FEATURE_KEYS.map((key, index) => {
          const isSelected = isActive && index === selectedIndex;
          const enabled = features[key] ?? false;
          return (
            <Text key={key}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '> ' : '  '}
              </Text>
              <Text bold={isSelected}>{FEATURE_LABELS[key]}</Text>
              <Text color={enabled ? 'green' : 'red'}>{enabled ? ' [on]' : ' [off]'}</Text>
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}

export { FEATURE_KEYS };
