import { Box } from 'ink';
import React, { useEffect, useState } from 'react';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { LoadingAnimation } from './LoadingAnimation.js';
import { Logo } from './Logo.js';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const { rows: terminalRows } = useTerminalSize();
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Show loading animation after initial delay
    const loadingTimer = setTimeout(() => setShowLoading(true), 500);

    // Complete splash screen after duration
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
      height={terminalRows}
    >
      <Logo />
      <Box marginTop={1}>{showLoading && <LoadingAnimation />}</Box>
    </Box>
  );
}
