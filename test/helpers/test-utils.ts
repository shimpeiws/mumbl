/**
 * Shared test utilities
 *
 * This module provides common test helpers and utilities
 * used across unit, integration, and E2E tests.
 */

import { vol } from 'memfs';
import { vi } from 'vitest';

/**
 * Create a mock in-memory git repository structure
 *
 * @param basePath - Base path for the mock repository
 * @returns Cleanup function to reset the filesystem
 */
export function createMockGitRepo(basePath = '/mock-repo'): () => void {
  // Create a mock git repository structure
  vol.fromJSON(
    {
      [`${basePath}/.git/config`]: '[core]\nrepositoryformatversion = 0\n',
      [`${basePath}/.git/HEAD`]: 'ref: refs/heads/main\n',
      [`${basePath}/.git/refs/heads/main`]: 'abc123\n',
      [`${basePath}/README.md`]: '# Test Repository\n',
    },
    basePath,
  );

  // Return cleanup function
  return () => {
    vol.reset();
  };
}

/**
 * Mock shell command execution
 *
 * @param command - The command to mock
 * @param output - The output to return
 * @returns Spy object for assertions
 */
export function mockExecSync(
  command: string,
  output: string,
): ReturnType<typeof vi.spyOn> {
  const execSync = vi.fn(() => output);
  return vi.spyOn({ execSync }, 'execSync').mockImplementation(execSync);
}

/**
 * Clean up mock filesystem
 */
export function cleanupMockFs(): void {
  vol.reset();
}

/**
 * Create a temporary test directory structure
 *
 * @param structure - Object representing the directory structure
 * @param basePath - Base path for the structure
 */
export function createTempStructure(
  structure: Record<string, string>,
  basePath = '/tmp/test',
): void {
  vol.fromJSON(structure, basePath);
}
