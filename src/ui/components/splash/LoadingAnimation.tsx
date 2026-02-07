import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

const SPINNER_FRAMES = ['💎', '💜', '☁️', '✨', '🔮', '💫'] as const;

const MESSAGES = [
  { text: 'la di da di da', color: 'magenta' },
  { text: 'trust the process', color: 'cyan' },
  { text: 'freebandz loading', color: 'blue' },
  { text: 'mask off', color: 'yellow' },
  { text: 'dripping sauce', color: 'magenta' },
  { text: 'pluto mode', color: 'cyan' },
] as const;

const SPARKLES = [
  '·  ✦  ˚  ⋆  ·',
  '✦  ˚  ⋆  ·  ✧',
  '˚  ⋆  ·  ✧  ˚',
  '⋆  ·  ✧  ˚  ✦',
  '·  ✧  ˚  ✦  ⋆',
  '✧  ˚  ✦  ⋆  ·',
] as const;

export function LoadingAnimation() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % (SPINNER_FRAMES.length * MESSAGES.length));
    }, 150);
    return () => clearInterval(timer);
  }, []);

  type MessageIndex = 0 | 1 | 2 | 3 | 4 | 5;
  type SpinnerIndex = 0 | 1 | 2 | 3 | 4 | 5;
  type SparkleIndex = 0 | 1 | 2 | 3 | 4 | 5;

  const spinnerIndex = (frame % SPINNER_FRAMES.length) as SpinnerIndex;
  const messageIndex = (Math.floor(frame / SPINNER_FRAMES.length) % MESSAGES.length) as MessageIndex;
  const sparkleIndex = (frame % SPARKLES.length) as SparkleIndex;
  const bottomSparkleIndex = ((frame + 3) % SPARKLES.length) as SparkleIndex;

  const dots = '.'.repeat((frame % 3) + 1).padEnd(3, ' ');
  const sparkle = SPARKLES[sparkleIndex];
  const bottomSparkle = SPARKLES[bottomSparkleIndex];
  const current = MESSAGES[messageIndex];

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="magenta">{sparkle}</Text>
      <Text> </Text>
      <Box>
        <Text color="yellow">{SPINNER_FRAMES[spinnerIndex]} </Text>
        <Text color={current.color} bold>
          {current.text}
        </Text>
        <Text dimColor> {dots}</Text>
      </Box>
      <Text> </Text>
      <Text color="magenta">{bottomSparkle}</Text>
    </Box>
  );
}
