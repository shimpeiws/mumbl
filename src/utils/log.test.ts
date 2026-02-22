import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debugLog } from './log.js';

describe('debugLog', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['MUMBL_DEBUG'];
  });

  it('should write to stderr when MUMBL_DEBUG=1', () => {
    process.env['MUMBL_DEBUG'] = '1';
    debugLog('test-context', new Error('test error'));

    expect(stderrSpy).toHaveBeenCalledWith('[mumbl:test-context] test error\n');
  });

  it('should not write when MUMBL_DEBUG is not set', () => {
    debugLog('test-context', new Error('test error'));

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('should handle non-Error values', () => {
    process.env['MUMBL_DEBUG'] = '1';
    debugLog('test-context', 'string error');

    expect(stderrSpy).toHaveBeenCalledWith('[mumbl:test-context] string error\n');
  });
});
