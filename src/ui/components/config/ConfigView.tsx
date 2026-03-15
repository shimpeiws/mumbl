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
    files,
    selectedFileIndex,
    setSelectedFileIndex,
    subMode,
    setSubMode,
    reloadFiles,
    toggleFeature,
  } = useConfig();

  const totalItems = files.length + FEATURE_KEYS.length;
  const isFeatureSelected = selectedFileIndex >= files.length;
  const featureIndex = selectedFileIndex - files.length;

  useInput(
    (input, key) => {
      if (key.escape) {
        switchToList();
        return;
      }

      if (input === 'j' || key.downArrow) {
        if (totalItems > 0) {
          setSelectedFileIndex(Math.min(selectedFileIndex + 1, totalItems - 1));
        }
        return;
      }

      if (input === 'k' || key.upArrow) {
        if (totalItems > 0) {
          setSelectedFileIndex(Math.max(selectedFileIndex - 1, 0));
        }
        return;
      }

      if (input === 'a') {
        setSubMode('add-file');
        return;
      }

      if (input === 'd' && !isFeatureSelected && files.length > 0) {
        setSubMode('delete-confirm');
        return;
      }

      if (input === 'r') {
        reloadFiles();
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
