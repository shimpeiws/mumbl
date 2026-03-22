import { Box, useInput } from 'ink';
import React from 'react';
import { useConfig } from '../../context/ConfigContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { AddFileView } from './AddFileView.js';
import { DeleteConfirm } from './DeleteConfirm.js';
import { FEATURE_KEYS, FeaturesSection } from './FeaturesSection.js';
import { LLMSettingsSection } from './LLMSettingsSection.js';
import { WordgrainSection } from './WordgrainSection.js';

export function ConfigView() {
  const { switchToList } = useNavigation();
  const {
    file,
    selectedIndex,
    setSelectedIndex,
    subMode,
    setSubMode,
    reloadFile,
    toggleFeature,
  } = useConfig();

  // Items: wordgrain file (1 if set, 0 if not) + feature keys
  const fileItemCount = file ? 1 : 0;
  const totalItems = fileItemCount + FEATURE_KEYS.length;
  const isFeatureSelected = selectedIndex >= fileItemCount;
  const featureIndex = selectedIndex - fileItemCount;

  useInput(
    (input, key) => {
      if (key.escape) {
        switchToList();
        return;
      }

      if (input === 'j' || key.downArrow) {
        if (totalItems > 0) {
          setSelectedIndex(Math.min(selectedIndex + 1, totalItems - 1));
        }
        return;
      }

      if (input === 'k' || key.upArrow) {
        if (totalItems > 0) {
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
        }
        return;
      }

      if (input === 'a') {
        setSubMode('add-file');
        return;
      }

      if (input === 'd' && !isFeatureSelected && file) {
        setSubMode('delete-confirm');
        return;
      }

      if (input === 'r') {
        reloadFile();
        return;
      }

      if ((input === ' ' || key.return) && isFeatureSelected) {
        const featureKey = FEATURE_KEYS[featureIndex];
        if (featureKey) {
          toggleFeature(featureKey);
        }
        return;
      }
    },
    { isActive: subMode === 'normal' },
  );

  if (subMode === 'add-file') {
    return (
      <Box flexDirection="column" padding={1}>
        <AddFileView />
      </Box>
    );
  }

  if (subMode === 'delete-confirm') {
    return (
      <Box flexDirection="column" padding={1}>
        <DeleteConfirm />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <LLMSettingsSection />
      <Box marginTop={1}>
        <WordgrainSection />
      </Box>
      <Box marginTop={1}>
        <FeaturesSection isActive={isFeatureSelected} selectedIndex={featureIndex} />
      </Box>
    </Box>
  );
}
