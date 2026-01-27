# mumbl

An AI-powered communication tool.

## Status

This project is in early development.

## Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Setup

```bash
pnpm install
```

### Available Scripts

```bash
# Development mode with watch
pnpm dev

# Type checking
pnpm type-check

# Lint code
pnpm lint

# Format code
pnpm format

# Build
pnpm build
```

## Testing

mumbl uses [Vitest](https://vitest.dev/) for testing with comprehensive coverage requirements.

### Running Tests

```bash
# Run tests in watch mode (development)
pnpm test

# Run specific test types
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:e2e          # E2E tests only

# Generate coverage report
pnpm test:coverage

# Run all CI checks (type-check + lint + test with coverage)
pnpm ci:all
```

### Test Structure

```
mumbl/
├── src/
│   ├── index.ts           # Source file
│   └── index.test.ts      # Co-located unit test
├── test/
│   ├── integration/       # Integration tests
│   ├── e2e/              # End-to-end tests
│   ├── fixtures/         # Test fixtures
│   └── helpers/          # Test utilities
└── coverage/             # Generated coverage reports (gitignored)
```

### Coverage Requirements

The project maintains strict coverage thresholds:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

Tests will fail if coverage drops below these thresholds.

### CI/CD

All tests run automatically on push and pull request via GitHub Actions:
- Type checking (Node 20)
- Linting and formatting (Node 20)
- Tests with coverage (Node 20, 22)
- Build verification (Node 20)

Coverage reports are uploaded to Codecov and archived as artifacts.

## License

MIT
