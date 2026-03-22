#!/usr/bin/env node
import * as fs from 'node:fs';
import { render } from 'ink';
import React from 'react';
import { getConfigFilePath } from './config/ConfigFile.js';
import { resolveConfig } from './config/index.js';
import { getReactionConfig } from './infrastructure/config/ReactionConfig.js';
import { closeDatabase, getDatabase } from './infrastructure/database/client.js';
import { createEntryService } from './services/EntryService.js';
import { ollamaService } from './services/OllamaService.js';
import { createReactionService } from './services/ReactionService.js';
import { createContextService } from './services/context/ContextService.js';
import { createFollowUpService } from './services/follow-up/FollowUpService.js';
import { createLLMServiceFromConfig } from './services/llm/LLMService.js';
import { createQueueService } from './services/queue/index.js';
import { createTrendService } from './services/trends/TrendService.js';
import { loadVocabulary } from './services/wordgrain/index.js';
import { App } from './ui/App.js';
import { ConfigProvider } from './ui/context/ConfigContext.js';
import { QueueProvider } from './ui/context/QueueContext.js';
import { ServiceProvider } from './ui/context/ServiceContext.js';

(async () => {
  // Check for CLI subcommands first
  if (process.argv.includes('generate-callout')) {
    const { generateCallout } = await import('./commands/GenerateCallout.js');
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

  // Check if this is the first run (no config file exists)
  const needsSetup = !fs.existsSync(getConfigFilePath());

  // Resolve configuration with priority: CLI > Environment > Config file > Default
  const config = resolveConfig();

  const db = getDatabase();

  // Create LLM service from config
  const llmService = createLLMServiceFromConfig(config);

  // Set up reaction service with optional LLM support
  const reactionConfig = getReactionConfig();
  const reactionLLMService = reactionConfig.useLLM ? llmService : undefined;
  const reactionService = createReactionService(db, reactionConfig, reactionLLMService);
  reactionService.setFeatures(config.features);

  // Load wordgrain vocabulary if configured
  if (config.wordgrainFile) {
    const vocabulary = loadVocabulary(config.wordgrainFile);
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

  const instance = render(
    <ServiceProvider
      entryService={entryService}
      ollamaService={ollamaService}
      llmService={llmService}
      reactionService={reactionService}
      queueService={queueService}
      trendService={trendService}
      contextService={contextService}
      followUpService={followUpService}
    >
      <QueueProvider queueService={queueService}>
        <ConfigProvider config={config}>
          <App needsSetup={needsSetup} />
        </ConfigProvider>
      </QueueProvider>
    </ServiceProvider>,
    { incrementalRendering: true },
  );

  await instance.waitUntilExit();

  // Graceful shutdown: wait for running tasks to complete
  await queueService.stop();
  closeDatabase();
})();
