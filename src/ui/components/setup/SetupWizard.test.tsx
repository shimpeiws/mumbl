import { cleanup, render } from 'ink-testing-library';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupWizard } from './SetupWizard.js';

vi.mock('../../../infrastructure/ollama/client.js', () => ({
  checkOllamaHealth: vi.fn(),
  listModels: vi.fn(),
}));

vi.mock('../../../config/config-file.js', () => ({
  saveConfigFile: vi.fn(),
}));

import { checkOllamaHealth, listModels } from '../../../infrastructure/ollama/client.js';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('SetupWizard', () => {
  it('should show checking message initially', () => {
    vi.mocked(checkOllamaHealth).mockReturnValue(new Promise(() => {}));
    const onComplete = vi.fn();

    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    expect(lastFrame()).toContain('Checking Ollama connection');
  });

  it('should show not-connected state when Ollama is down', async () => {
    vi.mocked(checkOllamaHealth).mockResolvedValue({
      isConnected: false,
      baseUrl: 'http://127.0.0.1:11434',
      error: 'Connection refused',
    });
    const onComplete = vi.fn();

    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Could not connect to Ollama');
    });

    expect(lastFrame()).toContain('Connection refused');
    expect(lastFrame()).toContain('brew install ollama');
    expect(lastFrame()).toContain('ollama serve');
    expect(lastFrame()).toContain('ollama pull llama3.1:8b');
  });

  it('should show model selection when connected with models', async () => {
    vi.mocked(checkOllamaHealth).mockResolvedValue({
      isConnected: true,
      baseUrl: 'http://127.0.0.1:11434',
    });
    vi.mocked(listModels).mockResolvedValue([
      {
        name: 'llama3.1:8b',
        modifiedAt: new Date(),
        size: 4_500_000_000,
        digest: 'abc123',
        details: {
          format: 'gguf',
          family: 'llama',
          parameterSize: '8B',
          quantizationLevel: 'Q4_0',
        },
      },
      {
        name: 'qwen2.5-coder:7b',
        modifiedAt: new Date(),
        size: 3_800_000_000,
        digest: 'def456',
        details: {
          format: 'gguf',
          family: 'qwen2',
          parameterSize: '7B',
          quantizationLevel: 'Q4_0',
        },
      },
    ]);
    const onComplete = vi.fn();

    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Connected to Ollama');
    });

    expect(lastFrame()).toContain('Select a model');
    expect(lastFrame()).toContain('llama3.1:8b');
    expect(lastFrame()).toContain('qwen2.5-coder:7b');
  });

  it('should show no models message when connected but no models installed', async () => {
    vi.mocked(checkOllamaHealth).mockResolvedValue({
      isConnected: true,
      baseUrl: 'http://127.0.0.1:11434',
    });
    vi.mocked(listModels).mockResolvedValue([]);
    const onComplete = vi.fn();

    const { lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('No models installed');
    });

    expect(lastFrame()).toContain('ollama pull llama3.1:8b');
  });

  it('should call onComplete when skip is pressed on not-connected', async () => {
    vi.mocked(checkOllamaHealth).mockResolvedValue({
      isConnected: false,
      baseUrl: 'http://127.0.0.1:11434',
    });
    const onComplete = vi.fn();

    const { stdin } = render(<SetupWizard onComplete={onComplete} />);

    await vi.waitFor(() => {
      expect(onComplete).not.toHaveBeenCalled();
    });

    // Wait for not-connected state
    await new Promise((r) => setTimeout(r, 50));

    stdin.write('s');

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('should retry connection when r is pressed', async () => {
    let callCount = 0;
    vi.mocked(checkOllamaHealth).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { isConnected: false, baseUrl: 'http://127.0.0.1:11434', error: 'Refused' };
      }
      return { isConnected: true, baseUrl: 'http://127.0.0.1:11434' };
    });
    vi.mocked(listModels).mockResolvedValue([
      {
        name: 'llama3.1:8b',
        modifiedAt: new Date(),
        size: 4_500_000_000,
        digest: 'abc',
      },
    ]);
    const onComplete = vi.fn();

    const { stdin, lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Could not connect');
    });

    stdin.write('r');

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Select a model');
    });

    expect(checkOllamaHealth).toHaveBeenCalledTimes(2);
  });

  it('should save config and call onComplete when model is selected', async () => {
    const { saveConfigFile } = await import('../../../config/config-file.js');
    vi.mocked(checkOllamaHealth).mockResolvedValue({
      isConnected: true,
      baseUrl: 'http://127.0.0.1:11434',
    });
    vi.mocked(listModels).mockResolvedValue([
      {
        name: 'llama3.1:8b',
        modifiedAt: new Date(),
        size: 4_500_000_000,
        digest: 'abc',
      },
    ]);
    const onComplete = vi.fn();

    const { stdin, lastFrame } = render(<SetupWizard onComplete={onComplete} />);

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Select a model');
    });

    stdin.write('\r');

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('llama3.1:8b');
    });

    expect(saveConfigFile).toHaveBeenCalledWith({ model: 'llama3.1:8b' });
  });
});
