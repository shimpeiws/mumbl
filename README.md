# mumbl

A terminal journaling app where AI just listens. Write what you feel — the AI acknowledges without advice, judgment, or therapy.

Powered by [Ollama](https://ollama.ai/) for fully local, private LLM processing.

## Install

```bash
npm install -g mumbl
```

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [Ollama](https://ollama.ai/)

### Ollama Setup

**Install Ollama:**

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

**Start the server and pull the recommended model:**

```bash
ollama serve
ollama pull llama3.1:8b
```

## Usage

```bash
mumbl
```

mumbl has three modes:

### List Mode (default)

Browse your journal entries organized by date. Each entry shows a preview and the AI's reaction below it.

| Key | Action |
|-----|--------|
| `j` / `↓` | Next entry |
| `k` / `↑` | Previous entry |
| `Enter` | View full entry |
| `Tab` | Write new entry |
| `c` | Config |
| `q` | Quit |

### Write Mode

Press `Tab` to write a new entry. Type freely — press `Enter` to save, `Escape` to cancel.

### Config Mode

Press `c` to view LLM settings and manage wordgrain vocabulary files.

| Key | Action |
|-----|--------|
| `a` | Add wordgrain file |
| `d` | Remove selected file |
| `r` | Reload files |
| `Escape` | Back to list |

## How It Reacts

mumbl's AI follows a "pluto mode" philosophy — distant but listening. Reactions are intentionally minimal:

- **Read receipt** (~25%): `·` — just acknowledgment
- **Single word** (~25%): `cool`, `mood`, `real`
- **Short phrase** (~45%): `that's rough`, `felt that`, `hearing you`
- **Short sentence** (~5%): only for major emotional moments

The AI never gives advice, never asks "are you okay?", and never reframes your feelings. Silence is okay.

## Wordgrain (Vocabulary Customization)

Wordgrain files (`.wg.json`) let you infuse the AI's reactions with your own vocabulary and style.

```json
{
  "name": "my-vocab",
  "grains": [
    { "word": "wavy", "context": "cool, good vibes", "tags": ["style"] },
    { "word": "real", "context": "authentic, legit", "tags": ["affirmation"] }
  ]
}
```

Register files in Config mode (`c` → `a`) or in the config file:

```json
{
  "wordgrainFiles": ["/path/to/vocab.wg.json"]
}
```

When loaded, the AI weaves your vocabulary into reactions: `"not wavy"`, `"that's fly"`, `"real"`.

## Configuration

Config file: `~/.config/mumbl/config.json`

```json
{
  "model": "llama3.1:8b",
  "baseUrl": "http://localhost:11434",
  "wordgrainFiles": []
}
```

Environment variables (override config file):

| Variable | Description |
|----------|-------------|
| `MUMBL_MODEL` | Model name |
| `MUMBL_BASE_URL` | Ollama server URL |

CLI flags (override everything):

```bash
mumbl --model llama3.1:8b
```

## Claude Code Integration

mumbl integrates with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) via hooks to show agent activity and generate contextual callout messages.

Add the following to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "printf 'thinking:claude-code' > /tmp/mumbl-agent-status"
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "printf 'idle:claude-code' > /tmp/mumbl-agent-status"
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
            "command": "printf 'idle:claude-code' > /tmp/mumbl-agent-status"
          },
          {
            "type": "command",
            "command": "mumbl generate-callout"
          }
        ]
      }
    ]
  }
}
```

### What each hook does

| Hook | Action |
|------|--------|
| **PreToolUse** | Sets agent status to `thinking` — mumbl shows the activity indicator |
| **PermissionRequest** | Sets agent status to `idle` — agent is waiting for user input |
| **Stop** | Sets agent status to `idle` and runs `generate-callout` to create a check-in message from recent journal entries |

### Agent Status Display

mumbl watches `/tmp/mumbl-agent-status` and shows real-time agent activity in the terminal title. The file format is `status:agent-name` (e.g., `thinking:claude-code`).

Supported agents: `claude-code`, `gemini-cli`, `cursor`, `windsurf`.

### Callout Messages

`mumbl generate-callout` reads your recent journal entries and generates a short contextual message, written to `/tmp/mumbl-message`. It has a 5-minute cooldown to avoid repeated calls.

You can also run it standalone:

```bash
mumbl generate-callout
cat /tmp/mumbl-message
```

## Development

```bash
git clone https://github.com/shimpeiws/mumbl.git
cd mumbl
pnpm install
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run in development mode |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests (watch mode) |
| `pnpm type-check` | TypeScript type checking |
| `pnpm lint` | Run Biome linter |
| `pnpm ci:all` | Full CI check (types + lint + tests) |

### Tech Stack

- TypeScript, React, [Ink](https://github.com/vadimdemedes/ink) (terminal UI)
- [Ollama](https://ollama.ai/) via LangChain.js
- SQLite (better-sqlite3) for local storage
- Vitest for testing (70%+ coverage required)
- Biome for linting and formatting

## License

[MIT](LICENSE)
