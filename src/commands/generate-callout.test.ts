import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COOLDOWN_FILE,
  DEFAULT_COOLDOWN_MS,
  MESSAGE_FILE,
  generateCallout,
  isCooldownActive,
} from './generate-callout.js';

// Mock all external dependencies
vi.mock('node:fs');
vi.mock('../config/index.js', () => ({
  resolveConfig: vi.fn(() => ({
    provider: 'ollama' as const,
    model: 'test-model',
    baseUrl: 'http://localhost:11434',
  })),
}));
vi.mock('../infrastructure/database/client.js', () => ({
  getDatabase: vi.fn(() => ({})),
  closeDatabase: vi.fn(),
}));
vi.mock('../repositories/entry-repository.js', () => ({
  createEntryRepository: vi.fn(() => ({
    findAll: vi.fn(() => []),
  })),
}));
vi.mock('../services/llm/llm-service.js', () => ({
  createProvider: vi.fn(() => ({
    chat: vi.fn(async () => ({ content: 'still grinding', model: 'test' })),
  })),
}));

const mockedFs = vi.mocked(fs);

describe('isCooldownActive', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false when cooldown file does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    expect(isCooldownActive()).toBe(false);
  });

  it('should return true when cooldown has not elapsed', () => {
    mockedFs.existsSync.mockReturnValue(true);
    const recentTimestamp = String(Date.now() - 1000); // 1 second ago
    mockedFs.readFileSync.mockReturnValue(recentTimestamp);

    expect(isCooldownActive()).toBe(true);
  });

  it('should return false when cooldown has elapsed', () => {
    mockedFs.existsSync.mockReturnValue(true);
    const oldTimestamp = String(Date.now() - DEFAULT_COOLDOWN_MS - 1000);
    mockedFs.readFileSync.mockReturnValue(oldTimestamp);

    expect(isCooldownActive()).toBe(false);
  });

  it('should return false when file read throws an error', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('read error');
    });

    expect(isCooldownActive()).toBe(false);
  });
});

describe('generateCallout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip when message file already exists', async () => {
    mockedFs.existsSync.mockImplementation((p) => {
      if (p === MESSAGE_FILE) return true;
      return false;
    });

    await generateCallout();

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should skip when cooldown is active', async () => {
    mockedFs.existsSync.mockImplementation((p) => {
      if (p === MESSAGE_FILE) return false;
      if (p === COOLDOWN_FILE) return true;
      return false;
    });
    const recentTimestamp = String(Date.now() - 1000);
    mockedFs.readFileSync.mockReturnValue(recentTimestamp);

    await generateCallout();

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should skip when no entries exist', async () => {
    mockedFs.existsSync.mockReturnValue(false);

    const { createEntryRepository } = await import('../repositories/entry-repository.js');
    vi.mocked(createEntryRepository).mockReturnValue({
      findAll: vi.fn(() => []),
      insert: vi.fn(),
      findById: vi.fn(() => null),
      update: vi.fn(() => {
        throw new Error('not implemented');
      }),
      delete: vi.fn(() => false),
      count: vi.fn(() => 0),
      search: vi.fn(() => []),
    });

    await generateCallout();

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should generate callout and write to message file', async () => {
    mockedFs.existsSync.mockReturnValue(false);

    const mockEntry = {
      id: '1',
      content: 'worked late again',
      timestamp: new Date(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { createEntryRepository } = await import('../repositories/entry-repository.js');
    vi.mocked(createEntryRepository).mockReturnValue({
      findAll: vi.fn(() => [mockEntry]),
      insert: vi.fn(),
      findById: vi.fn(() => null),
      update: vi.fn(() => {
        throw new Error('not implemented');
      }),
      delete: vi.fn(() => false),
      count: vi.fn(() => 0),
      search: vi.fn(() => []),
    });

    const { createProvider } = await import('../services/llm/llm-service.js');
    vi.mocked(createProvider).mockReturnValue({
      chat: vi.fn(async () => ({ content: 'still grinding', model: 'test' })),
      stream: vi.fn(),
      healthCheck: vi.fn(async () => true),
      getProviderName: vi.fn(() => 'ollama' as const),
      getModelName: vi.fn(() => 'test'),
    });

    await generateCallout();

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(MESSAGE_FILE, 'still grinding', 'utf-8');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(COOLDOWN_FILE, expect.any(String), 'utf-8');
  });

  it('should not throw on error', async () => {
    mockedFs.existsSync.mockImplementation(() => {
      throw new Error('unexpected error');
    });

    // Should not throw
    await expect(generateCallout()).resolves.toBeUndefined();
  });
});
