#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { closeDatabase, getDatabase } from './infrastructure/database/client.js';
import { EntryService } from './services/entry-service.js';
import { OllamaService } from './services/ollama-service.js';
import { App } from './ui/App.js';
import { ServiceProvider } from './ui/context/ServiceContext.js';

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

  const db = getDatabase();
  const entryService = new EntryService(db);
  const ollamaService = new OllamaService();

  const instance = render(
    <ServiceProvider entryService={entryService} ollamaService={ollamaService}>
      <App />
    </ServiceProvider>,
  );

  await instance.waitUntilExit();
  closeDatabase();
})();
