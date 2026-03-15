import { Box, Text, useApp, useInput } from 'ink';
import React, { useCallback, useEffect, useState } from 'react';
import { saveConfigFile } from '../../../config/ConfigFile.js';
import { checkOllamaHealth, listModels } from '../../../infrastructure/ollama/client.js';
import type { OllamaModel } from '../../../infrastructure/ollama/types.js';
import { Logo } from '../splash/Logo.js';

type WizardStep = 'checking' | 'not-connected' | 'select-model' | 'complete';

interface SetupWizardProps {
  onComplete: (model?: string) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { exit } = useApp();
  const [step, setStep] = useState<WizardStep>('checking');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | undefined>();

  const checkConnection = useCallback(async () => {
    setStep('checking');
    setError(undefined);

    const health = await checkOllamaHealth();

    if (!health.isConnected) {
      setError(health.error);
      setStep('not-connected');
      return;
    }

    try {
      const available = await listModels();
      if (available.length === 0) {
        setModels([]);
        setStep('select-model');
        return;
      }
      setModels(available);
      setStep('select-model');
    } catch {
      setModels([]);
      setStep('select-model');
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (step === 'not-connected') {
      if (input === 'r') {
        checkConnection();
        return;
      }
      if (input === 's') {
        onComplete();
        return;
      }
    }

    if (step === 'select-model') {
      if (models.length > 0) {
        if (input === 'j' || key.downArrow) {
          setSelectedIndex((prev) => Math.min(prev + 1, models.length - 1));
          return;
        }
        if (input === 'k' || key.upArrow) {
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (key.return) {
          const selected = models[selectedIndex];
          if (selected) {
            saveConfigFile({ model: selected.name });
            onComplete(selected.name);
          }
          return;
        }
      }
      if (input === 's') {
        onComplete();
        return;
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Logo />
      <Box marginTop={1} flexDirection="column">
        {step === 'checking' && <CheckingStep />}
        {step === 'not-connected' && <NotConnectedStep error={error} />}
        {step === 'select-model' && (
          <SelectModelStep models={models} selectedIndex={selectedIndex} />
        )}
      </Box>
    </Box>
  );
}

function CheckingStep() {
  return (
    <Box flexDirection="column">
      <Text color="cyan">Checking Ollama connection...</Text>
    </Box>
  );
}

function NotConnectedStep({ error }: { error?: string }) {
  return (
    <Box flexDirection="column">
      <Text color="red" bold>
        Could not connect to Ollama
      </Text>
      {error && (
        <Box marginTop={1} paddingLeft={2}>
          <Text dimColor>{error}</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column" paddingLeft={2}>
        <Text>To get started, install and run Ollama:</Text>
        <Box marginTop={1} flexDirection="column" paddingLeft={2}>
          <Text dimColor>1. Install: </Text>
          <Text color="green"> brew install ollama</Text>
          <Text dimColor>2. Start: </Text>
          <Text color="green"> ollama serve</Text>
          <Text dimColor>3. Pull a model: </Text>
          <Text color="green"> ollama pull llama3.1:8b</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[r] retry [s] skip [q] quit</Text>
      </Box>
    </Box>
  );
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)}GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

function SelectModelStep({
  models,
  selectedIndex,
}: {
  models: OllamaModel[];
  selectedIndex: number;
}) {
  if (models.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="green">Connected to Ollama</Text>
        <Box marginTop={1}>
          <Text color="yellow">No models installed.</Text>
        </Box>
        <Box marginTop={1} flexDirection="column" paddingLeft={2}>
          <Text>Pull a model to get started:</Text>
          <Box marginTop={1}>
            <Text color="green"> ollama pull llama3.1:8b</Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>[s] skip [q] quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="green">Connected to Ollama</Text>
      <Box marginTop={1}>
        <Text bold>Select a model:</Text>
      </Box>
      <Box marginTop={1} flexDirection="column" paddingLeft={2}>
        {models.map((model, i) => {
          const isSelected = i === selectedIndex;
          const prefix = isSelected ? '>' : ' ';
          const size = model.size ? ` (${formatSize(model.size)})` : '';
          const params = model.details?.parameterSize ? ` [${model.details.parameterSize}]` : '';
          return (
            <Text key={model.name} color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {prefix} {model.name}
              <Text dimColor>
                {params}
                {size}
              </Text>
            </Text>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>[j/k] navigate [Enter] select [s] skip [q] quit</Text>
      </Box>
    </Box>
  );
}
