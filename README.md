# mumbl

An AI-powered communication tool.

## Status

This project is in early development.

## Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- [Ollama](https://ollama.ai/) (for LLM features)

### Ollama Installation

This application uses Ollama for local LLM communication.

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Start the Ollama server:**
```bash
ollama serve
```

**Pull the default model:**
```bash
ollama pull qwen2.5-coder:7b
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MUMBL_OLLAMA_URL` | `http://localhost:11434` | Ollama server base URL |
| `MUMBL_OLLAMA_MODEL` | `qwen2.5-coder:7b` | Default model to use |
| `MUMBL_OLLAMA_TIMEOUT` | `30000` | Connection timeout (ms) |

### Agent Status Integration

mumbl can display real-time AI agent activity in the terminal title. When a coding agent (Claude Code, Gemini CLI) is processing, the terminal title updates to show its status.

#### Claude Code

Add the following to your Claude Code settings file (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo -n 'thinking:claude-code' > /tmp/mumbl-agent-status"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo -n 'idle:claude-code' > /tmp/mumbl-agent-status"
          }
        ]
      }
    ]
  }
}
```

#### Gemini CLI

Add the following to your Gemini CLI settings file (`~/.gemini/settings.json`):

```json
{
  "hooks": {
    "BeforeTool": [
      {
        "command": "echo -n 'thinking:gemini-cli' > /tmp/mumbl-agent-status"
      }
    ],
    "AfterAgent": [
      {
        "command": "echo -n 'idle:gemini-cli' > /tmp/mumbl-agent-status"
      }
    ]
  }
}
```

#### How It Works

1. **An agent triggers a hook** before each tool use, writing status to `/tmp/mumbl-agent-status`
2. **mumbl watches the status file** for changes using `fs.watch` and polling
3. **The terminal title updates** to show the agent's current activity (e.g., "Claude thinking...", "Gemini thinking...")
4. **When the agent stops**, the hook writes `idle` and the title resets to "mumbl"

The status file format supports an extended format (`thinking:agent-name`) for agent identification, and plain `thinking`/`idle` for backward compatibility.

#### Verification

You can manually test the integration:

```bash
# Start mumbl in one terminal
pnpm dev

# In another terminal, simulate agent activity:
echo -n 'thinking:claude-code' > /tmp/mumbl-agent-status   # "Claude thinking..."
echo -n 'thinking:gemini-cli' > /tmp/mumbl-agent-status    # "Gemini thinking..."
echo -n 'idle:claude-code' > /tmp/mumbl-agent-status       # Title resets to "mumbl"
```

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
