#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

(async () => {
  // Check if running in TTY environment
  if (!process.stdin.isTTY) {
    // Non-TTY mode: Simple console output and exit
    console.log('mumbl - AI-powered communication tool');
    console.log('');
    console.log('Running in non-interactive mode (no TTY detected)');
    console.log('Status: Ready');
    console.log('');
    console.log('Note: Interactive mode requires a TTY. Run in a terminal for full experience.');
    process.exit(0);
  }

  // TTY mode: Full interactive Ink app
  const instance = render(<App />);
  await instance.waitUntilExit();
})();
