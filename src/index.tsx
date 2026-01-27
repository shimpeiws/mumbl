#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { App } from './ui/App.js';

(async () => {
  if (!process.stdin.isTTY) {
    console.log('mumbl - AI-powered communication tool');
    console.log('');
    console.log('Running in non-interactive mode (no TTY detected)');
    console.log('Status: Ready');
    console.log('');
    console.log('Note: Interactive mode requires a TTY. Run in a terminal for full experience.');
    process.exit(0);
  }

  const instance = render(<App />);
  await instance.waitUntilExit();
})();
