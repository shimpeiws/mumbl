import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/*.test.ts',
        '**/__tests__/**',
        'test/**',
        '*.config.ts',
        '*.config.js',
        'src/index.tsx', // TUI entry point, requires special testing
        'src/ui/**/*.tsx', // TUI components, require ink-testing-library
        'src/ui/hooks/**', // TUI hooks, require ink-testing-library
        'src/ui/context/**', // TUI context, require ink-testing-library
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**/*.ts', 'test/**/*.test.ts'],
    testTimeout: 10000,
    globalSetup: './test/helpers/setup.ts',
  },
});
