#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { resolveConfig } from './config/index.js';
import { getReactionConfig } from './infrastructure/config/reaction-config.js';
import { closeDatabase, getDatabase } from './infrastructure/database/client.js';
import { createContextService } from './services/context/context-service.js';
import { createConversationService } from './services/conversation/conversation-service.js';
import { createEntryService } from './services/entry-service.js';
import { createFollowUpService } from './services/follow-up/follow-up-service.js';
import { createLLMServiceFromConfig } from './services/llm/llm-service.js';
import { ollamaService } from './services/ollama-service.js';
import { createQueueService } from './services/queue/index.js';
import { createReactionService } from './services/reaction-service.js';
import { createTrendService } from './services/trends/trend-service.js';
import { loadVocabulary } from './services/wordgrain/index.js';
import { App } from './ui/App.js';
import { QueueProvider } from './ui/context/QueueContext.js';
import { ServiceProvider } from './ui/context/ServiceContext.js';

(async () => {
  // Check for CLI subcommands first
  if (process.argv.includes('generate-callout')) {
    const { generateCallout } = await import('./commands/generate-callout.js');
    await generateCallout();
    process.exit(0);
  }

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
  const reactionService = createReactionService(db, reactionConfig, reactionLLMService);

  // Load wordgrain vocabulary if configured
  if (config.wordgrainDir) {
    const vocabulary = loadVocabulary(config.wordgrainDir);
    if (vocabulary) {
      llmService.setVocabulary(vocabulary);
      reactionService.setVocabulary(vocabulary);
    }
  }

  // Create queue service for background processing
  const queueService = createQueueService(llmService, reactionService);
  queueService.start();

  // Create trend service for topic analysis
  const trendService = createTrendService(db, llmService);

  // Create context service for long-term user profile
  const contextService = createContextService(db, llmService);
  llmService.setContextService(contextService);

  // Create follow-up service for delayed check-ins
  const followUpService = createFollowUpService(db, llmService);

  // Create entry service with reaction, trend, context, and follow-up support
  const entryService = createEntryService(
    db,
    reactionService,
    trendService,
    contextService,
    followUpService,
  );
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
      contextService={contextService}
      followUpService={followUpService}
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
