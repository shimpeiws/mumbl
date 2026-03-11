import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { useAgentStatus } from '../hooks/useAgentStatus.js';
import { useTerminalTitle } from '../hooks/useTerminalTitle.js';
import { HelpFooter } from './components/common/HelpFooter.js';
import { ModeIndicator } from './components/common/ModeIndicator.js';
import { ConfigView } from './components/config/ConfigView.js';
import { EntryList } from './components/entries/EntryList.js';
import { SetupWizard } from './components/setup/SetupWizard.js';
import { SplashScreen } from './components/splash/SplashScreen.js';
import { WriteView } from './components/write/WriteView.js';
import { NavigationProvider, useNavigation } from './context/NavigationContext.js';
import { useQueue } from './context/QueueContext.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';

function AppContent() {
  const { exit } = useApp();
  const { mode, toggleMode, switchToConfig } = useNavigation();
  const { status: queueStatus } = useQueue();
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const agentStatus = useAgentStatus();
  useTerminalTitle(agentStatus);
  const { rows: terminalRows } = useTerminalSize();

  // Fixed content height keeps total output height constant across mode switches.
  // This prevents Ink's incremental renderer from leaving ghost lines when
  // the rendered height changes (e.g. duplicate headers, stacked borders).
  // Overhead: header(4) + footer(2) + 1 buffer = 7
  const contentHeight = Math.max(5, terminalRows - 7);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }

    if (key.tab && mode === 'list' && !isViewingDetail) {
      toggleMode();
    }

    if (input === 'c' && mode === 'list' && !isViewingDetail) {
      switchToConfig();
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

      <Box flexGrow={1} height={contentHeight} overflow="hidden">
        {mode === 'list' && <EntryList onViewingDetailChange={setIsViewingDetail} />}
        {mode === 'write' && <WriteView />}
        {mode === 'config' && <ConfigView />}
      </Box>

      <HelpFooter mode={mode} isViewingDetail={isViewingDetail} queueStatus={queueStatus} />
    </Box>
  );
}

interface AppProps {
  needsSetup?: boolean;
}

export function App({ needsSetup = false }: AppProps) {
  const [showSetup, setShowSetup] = useState(needsSetup);
  const [showSplash, setShowSplash] = useState(true);

  if (showSetup) {
    return <SetupWizard onComplete={() => setShowSetup(false)} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}
