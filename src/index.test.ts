/**
 * Unit tests for main entry point
 */

import { describe, expect, it, vi } from 'vitest';
import { main } from './index.js';

describe('main', () => {
  it('should log greeting message', () => {
    // Arrange: Spy on console.log
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act: Call main function
    main();

    // Assert: Verify console.log was called with correct message
    expect(consoleLogSpy).toHaveBeenCalledWith('Hello, mumbl!');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);

    // Cleanup
    consoleLogSpy.mockRestore();
  });

  it('should not throw errors', () => {
    // Arrange: Mock console.log to prevent output
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Act & Assert: Verify main doesn't throw
    expect(() => main()).not.toThrow();

    // Cleanup
    consoleLogSpy.mockRestore();
  });

  it('should be a function', () => {
    // Assert: Verify main is a function
    expect(typeof main).toBe('function');
  });
});
