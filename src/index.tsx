#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { resolveConfig } from './config/index.js';
import { getReactionConfig } from './infrastructure/config/reaction-config.js';
import { closeDatabase, getDatabase } from './infrastructure/database/client.js';
import { createConversationService } from './services/conversation/conversation-service.js';
import { EntryService } from './services/entry-service.js';
import { createLLMServiceFromConfig } from './services/llm/llm-service.js';
import { ollamaService } from './services/ollama-service.js';
import { QueueService } from './services/queue/index.js';
import { ReactionService } from './services/reaction-service.js';
import { createTrendService } from './services/trends/trend-service.js';
import { App } from './ui/App.js';
import { QueueProvider } from './ui/context/QueueContext.js';
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

  // Create queue service for background processing
  const queueService = new QueueService(llmService, reactionService);
  queueService.start();

  // Create trend service for topic analysis
  const trendService = createTrendService(db, llmService);

  // Create entry service with reaction and trend support
  const entryService = new EntryService(db, reactionService, trendService);
  // ollamaService is imported as a singleton object

  // Create conversation service for memory tracking
  const conversationService = createConversationService(db, llmService);

  const instance = render(
    <ServiceProvider
      entryService={entryService}
      ollamaService={ollamaService}
      llmService={llmService}
      reactionService={reactionService}
      queueService={queueService}
      conversationService={conversationService}
      trendService={trendService}
    >
      <QueueProvider queueService={queueService}>
        <App />
      </QueueProvider>
    </ServiceProvider>,
  );

  await instance.waitUntilExit();

  // Graceful shutdown: wait for running tasks to complete
  await queueService.stop();
  closeDatabase();
})();
