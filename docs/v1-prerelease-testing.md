# v1.0.0 Pre-release Manual Testing

Manual testing procedure before `npm publish`. Run on main branch after all PRs (#145, #146, #147, #148, #150) are merged.

---

## Prerequisites

| Requirement | Check |
|-------------|-------|
| Node.js >= 20.0.0 | `node --version` |
| pnpm >= 9.0.0 | `pnpm --version` |
| Ollama installed | `ollama --version` |
| `llama3.1:8b` pulled | `ollama list` |

---

## Environment Setup

### Backup existing data

```bash
mv ~/.config/mumbl/config.json ~/.config/mumbl/config.json.bak 2>/dev/null
mv ~/.mumbl/mumbl.db ~/.mumbl/mumbl.db.bak 2>/dev/null
mv ~/.mumbl/mumbl.db-shm ~/.mumbl/mumbl.db-shm.bak 2>/dev/null
mv ~/.mumbl/mumbl.db-wal ~/.mumbl/mumbl.db-wal.bak 2>/dev/null
```

### Build and link

```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
pnpm install && pnpm build
npm link
nodenv rehash      # required for nodenv users
```

### Verify CLI is available

```bash
which mumbl        # should print a path
mumbl --help 2>/dev/null || echo "no --help (expected)"
```

---

## Test 1: Setup Wizard (Ollama Running)

**Precondition**: `~/.config/mumbl/config.json` does not exist, Ollama is running

```bash
rm -f ~/.config/mumbl/config.json
ollama serve &    # if not already running
mumbl
```

- [ ] Logo is displayed
- [ ] "Checking Ollama connection..." appears
- [ ] Transitions to "Connected to Ollama"
- [ ] "Select a model:" with list of installed models
- [ ] `j/k` moves model selection
- [ ] `Enter` selects model -> transitions to splash screen
- [ ] `~/.config/mumbl/config.json` is created with selected model

```bash
cat ~/.config/mumbl/config.json
```

---

## Test 2: Setup Wizard (Ollama Stopped)

**Precondition**: `~/.config/mumbl/config.json` does not exist, Ollama is stopped

```bash
pkill ollama 2>/dev/null
rm -f ~/.config/mumbl/config.json
mumbl
```

- [ ] "Could not connect to Ollama" is displayed
- [ ] Setup instructions shown (`brew install ollama`, `ollama serve`, `ollama pull llama3.1:8b`)
- [ ] `r` retries connection (should fail again if still stopped)
- [ ] Start Ollama (`ollama serve &`), then `r` -> connects and shows model selection
- [ ] `s` skips setup and goes to splash screen
- [ ] `q` quits the app

---

## Test 3: Splash Screen

- [ ] Logo is displayed
- [ ] Loading animation plays
- [ ] Auto-transitions to main screen (Write mode) after ~2.5 seconds

---

## Test 4: Write Mode (Entry Creation)

- [ ] Starts in Write mode after initial launch
- [ ] "New Entry" header with input box is shown
- [ ] Can type characters
- [ ] `Backspace` deletes characters
- [ ] `Enter` saves the entry
- [ ] After save, auto-transitions to List mode with the created entry visible
- [ ] `Esc` or `Tab` cancels input and returns to List mode

**Create 3+ entries for subsequent tests:**

1. `feeling pretty good about today's progress`
2. `had a tough meeting this afternoon`
3. `thinking about what to cook for dinner`

---

## Test 5: List Mode (Entry Browsing)

**Precondition**: 2-3 entries created in Test 4

- [ ] Entries displayed in date groups ("Today", etc.)
- [ ] `j` / `↓` moves to next entry
- [ ] `k` / `↑` moves to previous entry
- [ ] Selected entry shows `>` cursor
- [ ] Each entry shows a reaction below it (`·` or short phrase)
- [ ] `Enter` opens entry detail view
- [ ] Detail view shows full entry text and reaction
- [ ] `Esc` or `q` in detail view returns to list
- [ ] `Tab` switches to Write mode
- [ ] `q` quits the app

---

## Test 6: Reaction Generation

**Precondition**: Ollama is running with a model available

- [ ] Reactions appear within a few seconds after entry creation
- [ ] Reactions are short (`·`, single word, or short phrase)
- [ ] Footer shows queue processing indicator (when tasks are queued)
- [ ] Multiple consecutive entries each get their own reaction
- [ ] No duplicate reactions in sequence (dedup is working)

---

## Test 7: Config Mode

- [ ] Press `c` in List mode -> transitions to Config mode
- [ ] LLM Settings section shows Provider, Model, Base URL
- [ ] Wordgrain Files section is shown (empty initially)
- [ ] `Esc` returns to List mode

---

## Test 8: Wordgrain (File Registration and Effect)

### Create test file

```bash
cat > /tmp/test-vocab.wg.json << 'EOF'
{
  "name": "test-vocab",
  "grains": [
    { "word": "vibes", "context": "feeling, atmosphere", "tags": ["mood"] },
    { "word": "legit", "context": "authentic, real", "tags": ["affirmation"] }
  ]
}
EOF
```

### Test steps

- [ ] In Config mode, press `a` -> file path input appears
- [ ] Enter `/tmp/test-vocab.wg.json` and press `Enter` -> file is registered
- [ ] File appears in the file list
- [ ] Statistics shown (grains count, words count)
- [ ] `~/.config/mumbl/config.json` has the path in `wordgrainFiles`
- [ ] Create an entry and check if reaction shows vocabulary influence (not required but check)
- [ ] `d` selects a file for deletion -> confirmation -> deleted
- [ ] `r` reloads files
- [ ] Entering a nonexistent path shows an error

```bash
cat ~/.config/mumbl/config.json   # verify wordgrainFiles
```

---

## Test 9: CLI Flag (Model Selection)

```bash
mumbl --model llama3.1:8b
```

- [ ] App starts with the specified model (verify in Config mode with `c`)

---

## Test 10: Environment Variables

### MUMBL_MODEL

```bash
MUMBL_MODEL=llama3.1:8b mumbl
```

- [ ] Model matches environment variable (verify in Config mode)

### MUMBL_BASE_URL

```bash
MUMBL_BASE_URL=http://localhost:11434 mumbl
```

- [ ] Base URL matches environment variable (verify in Config mode)

---

## Test 11: generate-callout Subcommand

**Precondition**: Entries exist in DB, Ollama is running

```bash
rm -f /tmp/mumbl-message /tmp/mumbl-callout-timestamp
mumbl generate-callout
```

- [ ] Command completes without error
- [ ] `/tmp/mumbl-message` contains a generated message

```bash
cat /tmp/mumbl-message
```

- [ ] Message content is readable and relevant

### Cooldown test

```bash
mumbl generate-callout    # run again within 5 minutes
```

- [ ] Skipped due to cooldown (file not updated)

```bash
stat -f "%m" /tmp/mumbl-message   # timestamp should be unchanged
```

---

## Test 12: Non-TTY Mode

```bash
echo "" | mumbl
```

- [ ] "Running in non-interactive mode (no TTY detected)" is displayed
- [ ] App exits immediately

---

## Test 13: Graceful Degradation (Ollama Stopped)

**Precondition**: Entries exist in DB

```bash
pkill ollama 2>/dev/null
mumbl
```

- [ ] App starts normally (no crash)
- [ ] List mode shows existing entries
- [ ] Can create new entries (input -> save works)
- [ ] Reactions are not generated or show default symbol (`·`)

**Restart Ollama after test:**

```bash
ollama serve &
```

---

## Test 14: Subsequent Launch (Config Exists)

**Precondition**: `~/.config/mumbl/config.json` exists from previous tests

```bash
mumbl
```

- [ ] Setup wizard is NOT shown
- [ ] Goes from splash screen directly to main screen
- [ ] Previous entries are shown in List (DB persistence works)

---

## Test 15: npm Package Verification

### Build

```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
pnpm build
```

- [ ] Build succeeds without errors

### Dry-run publish

```bash
npm publish --dry-run
```

- [ ] Dry-run succeeds

### Verify dist contents

```bash
# No test files in dist
find dist -name "*.test.js" -o -name "*.test.d.ts" | head -5
```

- [ ] No `.test.js` or `.test.d.ts` files found

### Verify package contents

```bash
npm pack --dry-run 2>&1 | head -30
```

- [ ] Package includes `dist/`, `LICENSE`, `README.md`, `package.json`
- [ ] Package does NOT include `src/`, `test/`, `node_modules/`

### Verify shebang

```bash
head -1 dist/index.js
```

- [ ] First line is `#!/usr/bin/env node`

---

## Cleanup

```bash
# Restore backups
mv ~/.config/mumbl/config.json.bak ~/.config/mumbl/config.json 2>/dev/null
mv ~/.mumbl/mumbl.db.bak ~/.mumbl/mumbl.db 2>/dev/null
mv ~/.mumbl/mumbl.db-shm.bak ~/.mumbl/mumbl.db-shm 2>/dev/null
mv ~/.mumbl/mumbl.db-wal.bak ~/.mumbl/mumbl.db-wal 2>/dev/null

# Unlink global CLI
npm unlink -g mumbl

# Remove test files
rm -f /tmp/test-vocab.wg.json /tmp/mumbl-message /tmp/mumbl-callout-timestamp /tmp/mumbl-agent-status
```

---

## Results Summary

| # | Test | Result |
|---|------|--------|
| 1 | Setup Wizard (Ollama running) | |
| 2 | Setup Wizard (Ollama stopped) | |
| 3 | Splash Screen | |
| 4 | Write Mode | |
| 5 | List Mode | |
| 6 | Reaction Generation | |
| 7 | Config Mode | |
| 8 | Wordgrain | |
| 9 | CLI flag `--model` | |
| 10 | Environment variables | |
| 11 | `generate-callout` subcommand | |
| 12 | Non-TTY mode | |
| 13 | Graceful degradation (Ollama off) | |
| 14 | Subsequent launch | |
| 15 | npm package verification | |
