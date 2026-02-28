# Changelog

## [1.0.1] - 2026-02-28

### Changed

- Add explicit `--tag latest` to npm publish command for reliable dist-tag assignment
- Update README install command to scoped package name
- Add barscan reference to Wordgrain section in README

## [1.0.0] - 2026-02-28

Initial public release.

### Core Features

- **Terminal journaling** with React/Ink-based TUI
- **AI-powered reactions** via local Ollama LLM - minimal "pluto mode" responses (read receipts, single words, short phrases)
- **Three UI modes**: List (browse entries), Write (create entries), Config (manage settings)
- **SQLite local storage** for all journal entries and reactions
- **Wordgrain vocabulary** customization via `.wg.json` files to personalize AI reactions
- **Background processing queue** for non-blocking LLM operations with retry logic

### AI & Reactions

- Mood-mapping rules for context-aware reactions
- Recent-reaction deduplication to prevent repetitive responses
- Vocabulary-based contextual phrase crafting
- Recent entries context for situationally aware reactions
- Language-aware reactions with auto-detection

### Agent Integration

- **Callout system** (`mumbl generate-callout`) for AI coding agent hooks
- **Agent status display** in terminal title with real-time activity monitoring
- Support for Claude Code and Gemini CLI status detection

### Services

- Trend detection and topic analysis
- Context accumulation engine for long-term user profiling
- Conversation memory system with threading support
- Delayed follow-up system for entry check-ins

### Configuration

- Config file (`~/.config/mumbl/config.json`) with model, baseUrl, and wordgrain settings
- Environment variable overrides (`MUMBL_MODEL`, `MUMBL_BASE_URL`)
- CLI flag overrides (`--model`)
- Initial setup wizard for first-time Ollama configuration

### Infrastructure

- Ollama-only LLM provider (fully local, private processing)
- TypeScript with strict mode
- Biome for linting and formatting
- Vitest testing suite with 70%+ coverage requirement
- Pre-push quality checks via Husky
