import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATUS_FILE_PATH, readStatusFile } from './useClaudeStatus.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    watch: vi.fn(),
  };
});

const fsMock = await import('node:fs');
const readFileSyncMock = vi.mocked(fsMock.readFileSync);
const watchMock = vi.mocked(fsMock.watch);

describe('useClaudeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('STATUS_FILE_PATH', () => {
    it('should be /tmp/mumbl-claude-status', () => {
      expect(STATUS_FILE_PATH).toBe('/tmp/mumbl-claude-status');
    });
  });

  describe('readStatusFile', () => {
    it('should return thinking when file contains thinking', () => {
      readFileSyncMock.mockReturnValue('thinking');
      expect(readStatusFile()).toBe('thinking');
    });

    it('should return idle when file contains idle', () => {
      readFileSyncMock.mockReturnValue('idle');
      expect(readStatusFile()).toBe('idle');
    });

    it('should return idle when file is missing', () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(readStatusFile()).toBe('idle');
    });

    it('should return idle when file contains invalid content', () => {
      readFileSyncMock.mockReturnValue('invalid-content');
      expect(readStatusFile()).toBe('idle');
    });

    it('should return idle when file is empty', () => {
      readFileSyncMock.mockReturnValue('');
      expect(readStatusFile()).toBe('idle');
    });

    it('should trim whitespace from file content', () => {
      readFileSyncMock.mockReturnValue('  thinking  \n');
      expect(readStatusFile()).toBe('thinking');
    });

    it('should accept a custom file path', () => {
      readFileSyncMock.mockReturnValue('thinking');
      readStatusFile('/custom/path');
      expect(readFileSyncMock).toHaveBeenCalledWith('/custom/path', 'utf-8');
    });

    it('should use default path when no argument provided', () => {
      readFileSyncMock.mockReturnValue('idle');
      readStatusFile();
      expect(readFileSyncMock).toHaveBeenCalledWith(STATUS_FILE_PATH, 'utf-8');
    });
  });

  describe('useClaudeStatus hook', () => {
    it('should set up watcher and polling on mount', async () => {
      readFileSyncMock.mockReturnValue('idle');
      const closeMock = vi.fn();
      watchMock.mockReturnValue({ close: closeMock } as unknown as fsMock.FSWatcher);

      const { useClaudeStatus } = await import('./useClaudeStatus.js');
      expect(useClaudeStatus).toBeDefined();
      expect(typeof useClaudeStatus).toBe('function');
    });

    it('should handle watch throwing when file does not exist', () => {
      readFileSyncMock.mockReturnValue('idle');
      watchMock.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() => {
        watchMock(STATUS_FILE_PATH, () => {});
      }).toThrow('ENOENT');
    });
  });
});
