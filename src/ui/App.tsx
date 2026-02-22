import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { useAgentStatus } from '../hooks/useAgentStatus.js';
import { useTerminalTitle } from '../hooks/useTerminalTitle.js';
import { HelpFooter } from './components/common/HelpFooter.js';
import { ModeIndicator } from './components/common/ModeIndicator.js';
import { ConfigView } from './components/config/ConfigView.js';
import { ConversationView } from './components/conversation/ConversationView.js';
import { EntryList } from './components/entries/EntryList.js';
import { SplashScreen } from './components/splash/SplashScreen.js';
import { WriteView } from './components/write/WriteView.js';
import { NavigationProvider, useNavigation } from './context/NavigationContext.js';
import { useQueue } from './context/QueueContext.js';

function AppContent() {
  const { exit } = useApp();
  const { mode, toggleMode, switchToConfig } = useNavigation();
  const { status: queueStatus } = useQueue();
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const agentStatus = useAgentStatus();
  useTerminalTitle(agentStatus);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      if (mode === 'conversation') return;
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

      <Box flexGrow={1}>
        {mode === 'list' && <EntryList onViewingDetailChange={setIsViewingDetail} />}
        {mode === 'write' && <WriteView />}
        {mode === 'conversation' && <ConversationView />}
        {mode === 'config' && <ConfigView />}
      </Box>

      <HelpFooter mode={mode} isViewingDetail={isViewingDetail} queueStatus={queueStatus} />
    </Box>
  );
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}
