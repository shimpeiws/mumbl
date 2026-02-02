import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { HelpFooter } from './components/common/HelpFooter.js';
import { ModeIndicator } from './components/common/ModeIndicator.js';
import { EntryList } from './components/entries/EntryList.js';
import { WriteView } from './components/write/WriteView.js';
import { NavigationProvider, useNavigation } from './context/NavigationContext.js';

function AppContent() {
  const { exit } = useApp();
  const { mode, toggleMode } = useNavigation();
  const [isViewingDetail, setIsViewingDetail] = useState(false);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }

    if (key.tab && mode === 'list' && !isViewingDetail) {
      toggleMode();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1}>
        <Text bold color="cyan">
          mumbl
        </Text>
        <Text dimColor> - AI-powered communication tool</Text>
        <Box marginLeft={2}>
          <ModeIndicator currentMode={mode} />
        </Box>
      </Box>

      <Box flexGrow={1}>
        {mode === 'list' && <EntryList onViewingDetailChange={setIsViewingDetail} />}
        {mode === 'write' && <WriteView />}
      </Box>

      <HelpFooter mode={mode} isViewingDetail={isViewingDetail} />
    </Box>
  );
}

export const App = () => {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
};
