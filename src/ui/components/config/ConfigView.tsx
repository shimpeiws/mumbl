import { Box, useInput } from 'ink';
import React, { useState } from 'react';
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
  const [featuresSelectedIndex, setFeaturesSelectedIndex] = useState(0);

  useInput(
    (input, key) => {
      if (key.escape) {
        switchToList();
        return;
      }

      if (input === 'j' || key.downArrow) {
        if (files.length > 0) {
          setSelectedFileIndex(Math.min(selectedFileIndex + 1, files.length - 1));
        }
        return;
      }

      if (input === 'k' || key.upArrow) {
        if (files.length > 0) {
          setSelectedFileIndex(Math.max(selectedFileIndex - 1, 0));
        }
        return;
      }

      if (input === 'a') {
        setSubMode('add-file');
        return;
      }

      if (input === 'd' && files.length > 0) {
        setSubMode('delete-confirm');
        return;
      }

      if (input === 'r') {
        reloadFiles();
        return;
      }

      if (input === 'f') {
        setSubMode('features');
        return;
      }
    },
    { isActive: subMode === 'normal' },
  );

  useInput(
    (input, key) => {
      if (key.escape) {
        setSubMode('normal');
        return;
      }

      if (input === 'j' || key.downArrow) {
        setFeaturesSelectedIndex(Math.min(featuresSelectedIndex + 1, FEATURE_KEYS.length - 1));
        return;
      }

      if (input === 'k' || key.upArrow) {
        setFeaturesSelectedIndex(Math.max(featuresSelectedIndex - 1, 0));
        return;
      }

      if (input === ' ' || key.return) {
        const featureKey = FEATURE_KEYS[featuresSelectedIndex];
        if (featureKey) {
          toggleFeature(featureKey);
        }
        return;
      }
    },
    { isActive: subMode === 'features' },
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
        <FeaturesSection isActive={subMode === 'features'} selectedIndex={featuresSelectedIndex} />
      </Box>
    </Box>
  );
}
