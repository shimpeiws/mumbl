import { Box, Text } from 'ink';
import React from 'react';

interface LogoProps {
  dimmed?: boolean;
}

export function Logo({ dimmed = false }: LogoProps) {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="magenta" dimColor={dimmed}>
        {'·  ✦  ˚  ⋆  ·  ✧  ˚  ·  ✦  ·  ˚  ⋆  ✧  ·'}
      </Text>
      <Text> </Text>
      <Text color="cyan" bold dimColor={dimmed}>
        {'███╗   ███╗██╗   ██╗███╗   ███╗██████╗ ██╗     '}
      </Text>
      <Text color="cyan" bold dimColor={dimmed}>
        {'████╗ ████║██║   ██║████╗ ████║██╔══██╗██║     '}
      </Text>
      <Text color="magenta" bold dimColor={dimmed}>
        {'██╔████╔██║██║   ██║██╔████╔██║██████╔╝██║     '}
      </Text>
      <Text color="magenta" bold dimColor={dimmed}>
        {'██║╚██╔╝██║██║   ██║██║╚██╔╝██║██╔══██╗██║     '}
      </Text>
      <Text color="blue" bold dimColor={dimmed}>
        {'██║ ╚═╝ ██║╚██████╔╝██║ ╚═╝ ██║██████╔╝███████╗'}
      </Text>
      <Text color="blue" bold dimColor={dimmed}>
        {'╚═╝     ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝ ╚══════╝'}
      </Text>
      <Text> </Text>
      <Text color="magenta" dimColor={dimmed}>
        {'·  ✦  ˚  ⋆  ·  ✧  ˚  ·  ✦  ·  ˚  ⋆  ✧  ·'}
      </Text>
      <Text> </Text>
      <Text dimColor>{'ᶠʳᵉᵉᵇᵃⁿᵈᶻ ᶠᵒʳ ʸᵒᵘʳ ᶠᵉᵉˡⁱⁿᵍˢ'}</Text>
      <Text color="yellow" dimColor={dimmed}>
        {'la di da di da...'}
      </Text>
    </Box>
  );
}
