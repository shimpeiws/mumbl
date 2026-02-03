#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { resolveConfig } from './config/index.js';
import { getReactionConfig } from './infrastructure/config/reaction-config.js';
import { closeDatabase, getDatabase } from './infrastructure/database/client.js';
import { EntryService } from './services/entry-service.js';
import { createLLMServiceFromConfig } from './services/llm/llm-service.js';
import { OllamaService } from './services/ollama-service.js';
import { ReactionService } from './services/reaction-service.js';
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

  // Resolve configuration with priority: CLI > Environment > Config file > Default
  const config = resolveConfig();

  const db = getDatabase();

  // Create LLM service from config
  const llmService = createLLMServiceFromConfig(config);

  // Set up reaction service with optional LLM support
  const reactionConfig = getReactionConfig();
  const reactionLLMService = reactionConfig.useLLM ? llmService : undefined;
  const reactionService = new ReactionService(db, reactionConfig, reactionLLMService);

  // Create entry service with reaction support
  const entryService = new EntryService(db, reactionService);
  const ollamaService = new OllamaService();

  const instance = render(
    <ServiceProvider
      entryService={entryService}
      ollamaService={ollamaService}
      llmService={llmService}
      reactionService={reactionService}
    >
      <App />
    </ServiceProvider>,
  );

  await instance.waitUntilExit();
  closeDatabase();
})();
