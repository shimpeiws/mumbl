# v0.3.0 Milestone Verification

This document provides step-by-step verification procedures for mumbl v0.3.0 features.

## Target Features

### v0.3.0 New Features
1. **Agent Context Sharing** (issue #14) - Share journal context with AI coding agents
2. **Claude Code Wait Time Display** (issue #13) - Show elapsed time during processing

### Existing Features (Regression Testing)
3. Basic operations (create/view entries)
4. AI reaction generation
5. Splash screen display

---

## Prerequisites

```bash
# Node.js version check (>= 20.0.0)
node --version

# pnpm version check (>= 9.0.0)
pnpm --version

# Ollama installation check
ollama --version
```

---

## Setup

```bash
# 1. Install dependencies
cd /Users/shin/src/github.com/shimpeiws/mumbl
pnpm install

# 2. Run type check, lint, and tests
pnpm ci:all

# 3. Start Ollama (in another terminal)
ollama serve

# 4. Pull the model
ollama pull qwen2.5-coder:7b
```

---

## Verification Checklist

### 1. Basic Startup

| # | Item | Steps | Expected Result | OK/NG |
|---|------|-------|-----------------|-------|
| 1.1 | App startup | `pnpm dev` | Splash screen shows, then transitions to list view | |
| 1.2 | Splash display | Observe on startup | ASCII logo is displayed | |
| 1.3 | Clean exit | `Ctrl+C` | Exits without errors | |

### 2. Entry Operations

| # | Item | Steps | Expected Result | OK/NG |
|---|------|-------|-----------------|-------|
| 2.1 | Switch to write mode | Press `TAB` | Input field appears | |
| 2.2 | Create entry | Type text, press `Enter` | Entry is saved and appears in list | |
| 2.3 | View entry | Select entry in list | Entry detail is displayed | |
| 2.4 | Date grouping | Create entries on multiple days | Entries are grouped by date | |

### 3. AI Reactions

| # | Item | Steps | Expected Result | OK/NG |
|---|------|-------|-----------------|-------|
| 3.1 | Reaction generation | Wait after creating entry | Reaction is auto-generated | |
| 3.2 | Reaction display | Check entry detail | Rap/future-style reaction is shown | |
| 3.3 | Ollama connection error | Stop Ollama, then operate | Error message is displayed appropriately | |

### 4. Wait Time Display (issue #13)

| # | Item | Steps | Expected Result | OK/NG |
|---|------|-------|-----------------|-------|
| 4.1 | Wait time display | Create entry and observe during reaction generation | Wait time is shown during processing | |
| 4.2 | Minimum wait threshold | Execute short operation | Display doesn't appear for operations < 500ms | |
| 4.3 | Elapsed time update | Observe long operation | Elapsed time updates in real-time | |

### 5. Agent Context Sharing (issue #14)

| # | Item | Steps | Expected Result | OK/NG |
|---|------|-------|-----------------|-------|
| 5.1 | Agent detection | Run `pnpm dev` inside Claude Code | Detected as Claude Code | |
| 5.2 | Context sharing config | Check environment variables | `MUMBL_CONTEXT_SHARING_ENABLED=true` enables feature | |
| 5.3 | Unit tests | `pnpm test src/services/context-sharing` | Tests pass | |
| 5.4 | Integration tests | `pnpm test src/infrastructure/agent/context` | Tests pass | |

---

## Test Execution

```bash
# Run all tests
pnpm test:run

# Check coverage (70%+ required)
pnpm test:coverage

# Run full CI checks
pnpm ci:all
```

---

## Completion Criteria

- [ ] All checklist items are OK
- [ ] `pnpm ci:all` passes
- [ ] Coverage >= 70%
- [ ] No error logs

---

## Troubleshooting

### Ollama Connection Error
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check if model exists
ollama list
```

### Database Reset
```bash
# Delete development DB and start fresh
rm -rf ~/.mumbl/mumbl.db
```

---

## Related Files

- Entry point: [src/index.tsx](src/index.tsx)
- Context Sharing: [src/services/context-sharing/](src/services/context-sharing/)
- Wait Display: [src/ui/components/wait/WaitDisplay.tsx](src/ui/components/wait/WaitDisplay.tsx)
- Agent Adapters: [src/infrastructure/agent/adapters/](src/infrastructure/agent/adapters/)
- Agent Context: [src/infrastructure/agent/context/](src/infrastructure/agent/context/)
- Splash Screen: [src/ui/components/splash/](src/ui/components/splash/)
