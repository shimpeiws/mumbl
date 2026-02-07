import { Box, Text } from 'ink';
import React from 'react';

export function Logo() {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="magenta">{'·  ✦  ˚  ⋆  ·  ✧  ˚  ·  ✦  ·  ˚  ⋆  ✧  ·'}</Text>
      <Text> </Text>
      <Text color="cyan" bold>
        {'███╗   ███╗██╗   ██╗███╗   ███╗██████╗ ██╗     '}
      </Text>
      <Text color="cyan" bold>
        {'████╗ ████║██║   ██║████╗ ████║██╔══██╗██║     '}
      </Text>
      <Text color="magenta" bold>
        {'██╔████╔██║██║   ██║██╔████╔██║██████╔╝██║     '}
      </Text>
      <Text color="magenta" bold>
        {'██║╚██╔╝██║██║   ██║██║╚██╔╝██║██╔══██╗██║     '}
      </Text>
      <Text color="blue" bold>
        {'██║ ╚═╝ ██║╚██████╔╝██║ ╚═╝ ██║██████╔╝███████╗'}
      </Text>
      <Text color="blue" bold>
        {'╚═╝     ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝ ╚══════╝'}
      </Text>
      <Text> </Text>
      <Text color="magenta">{'·  ✦  ˚  ⋆  ·  ✧  ˚  ·  ✦  ·  ˚  ⋆  ✧  ·'}</Text>
      <Text> </Text>
      <Text dimColor>{'ᶠʳᵉᵉᵇᵃⁿᵈᶻ ᶠᵒʳ ʸᵒᵘʳ ᶠᵉᵉˡⁱⁿᵍˢ'}</Text>
      <Text color="yellow">{'la di da di da...'}</Text>
    </Box>
  );
}
