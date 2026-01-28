# ADR-0002: Defer Hot Reload for TUI Development

## Status

Accepted

## Context and Problem Statement

The current development workflow for the Ink-based TUI application requires manual restart after code changes: edit code → press 'q' to quit → run `pnpm dev` again. This workflow is time-consuming and less ergonomic compared to web development where Hot Module Replacement (HMR) is standard.

The question arose: Can we implement automatic restart or hot reload for the TUI application to improve developer experience?

This is particularly challenging because:
- Standard web HMR patterns don't apply to terminal applications
- TUI applications require TTY (teletype) stdin with raw mode for keyboard input
- Process monitoring tools typically spawn child processes with stdin as a pipe, not TTY
- We want a solution that's portable and doesn't require external tools

## Decision Drivers

- **Developer experience**: Faster iteration speed during development
- **Technical feasibility**: Compatibility with Ink's TTY requirements
- **Maintenance burden**: Complexity vs. benefit trade-off
- **External dependencies**: Preference for npm-installable solutions
- **Reliability**: Solution must work consistently across platforms

## Considered Options

### Option 1: Use tsx --watch

```json
{
  "scripts": {
    "dev": "tsx --watch src/index.tsx"
  }
}
```

**How it works**: tsx monitors files and restarts on changes.

**Result**: ❌ **Failed**

**Problem**: tsx --watch monitors stdin for file changes in addition to filesystem. When the TUI captures keyboard input, tsx interprets it as file changes and triggers constant restarts.

**Reference**: [tsx issue #163](https://github.com/privatenumber/tsx/issues/163)

### Option 2: Use nodemon

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.tsx"
  }
}
```

**How it works**: nodemon monitors files and spawns a new process on changes.

**Result**: ❌ **Failed**

**Problem**: nodemon spawns child processes with `stdin` as a **pipe**, not TTY. Ink requires TTY stdin for raw mode to capture keyboard input.

**Error**:
```
Error: Raw mode is not supported on the current process.stdin
```

**Code example showing the issue**:
```typescript
// Ink checks if stdin is a TTY
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true); // Enables keyboard capture
} else {
  throw new Error('Raw mode is not supported');
}

// When nodemon spawns: process.stdin.isTTY === false
// stdin is a pipe, not a TTY
```

### Option 3: Use nodemon with stdin configuration

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.tsx"
  },
  "nodemonConfig": {
    "stdin": true
  }
}
```

**How it works**: Attempt to pass stdin through to child process.

**Result**: ❌ **Failed**

**Problem**: The `stdin: true` configuration still passes stdin as a pipe, not a TTY. The fundamental issue remains.

**Technical explanation**:
```javascript
// nodemon spawns like this (simplified):
spawn('tsx', ['src/index.tsx'], {
  stdio: ['pipe', 'inherit', 'inherit']
  //       ^^^^^ stdin is pipe, not TTY
});

// What we need:
spawn('tsx', ['src/index.tsx'], {
  stdio: 'inherit'  // Inherit parent's TTY
});
```

### Option 4: Use watchexec (external tool)

```bash
watchexec -r -e ts,tsx -- tsx src/index.tsx
```

**How it works**: watchexec properly handles TTY applications by using `stdio: 'inherit'`.

**Result**: ✅ **Works technically**

**Pros**:
- Properly preserves TTY properties
- Reliable file watching
- Widely used in the Rust ecosystem

**Cons**:
- ❌ Requires separate installation (brew/cargo/binary download)
- ❌ Not an npm package (harder onboarding for JS developers)
- ❌ Additional dependency management

### Option 5: Build custom Node.js watcher

```typescript
import chokidar from 'chokidar';
import { spawn } from 'child_process';

const watcher = chokidar.watch('src/**/*.{ts,tsx}', {
  ignored: /(^|[\/\\])\../,
});

let child;

function restart() {
  if (child) child.kill();

  child = spawn('tsx', ['src/index.tsx'], {
    stdio: 'inherit', // ← Preserves TTY!
  });
}

watcher.on('change', restart);
restart();
```

**How it works**: Custom script using chokidar for file watching and Node.js spawn with `stdio: 'inherit'`.

**Result**: ✅ **Would work technically**

**Pros**:
- npm-installable (chokidar)
- Preserves TTY properties
- Full control over behavior
- Portable across platforms

**Cons**:
- ❌ Custom code to write and maintain
- ❌ Need to handle edge cases (rapid changes, cleanup, signals)
- ❌ Adds complexity to the project

### Option 6: Continue with manual restart workflow (CHOSEN)

```json
{
  "scripts": {
    "dev": "tsx src/index.tsx"
  }
}
```

**How it works**: Developer manually restarts the application after code changes.

**Workflow**:
1. Edit code in your editor
2. Press `q` in the terminal to quit the TUI
3. Run `pnpm dev` again
4. Repeat

**Result**: ✅ **Works reliably**

**Pros**:
- ✅ Simple and predictable
- ✅ No additional dependencies
- ✅ No complexity to maintain
- ✅ Reliable across all platforms
- ✅ Full control over when to restart

**Cons**:
- ❌ Slower iteration speed
- ❌ Less ergonomic developer experience
- ❌ Requires manual action after each change

## Decision Outcome

**Chosen option: Continue with manual restart workflow (Option 6)**

We accept the manual restart workflow for TUI development at this time. This is a **deferral**, not a permanent rejection of hot reload capabilities.

### Rationale

1. **Technical Limitations**: The fundamental incompatibility between process monitoring tools and TTY applications creates significant barriers. Standard tools (tsx --watch, nodemon) cannot be used reliably.

2. **Complexity vs. Benefit**: While hot reload would improve developer experience, the current alternatives require either:
   - External tool dependencies (watchexec)
   - Custom code maintenance (chokidar watcher)

   The benefit doesn't justify the added complexity at this stage of the project.

3. **Acceptable Workflow**: Manual restart is straightforward and reliable. The development pace is acceptable for the current project size.

4. **Future Flexibility**: By deferring this decision, we remain open to:
   - Implementing a custom watcher when the pain point becomes critical
   - Adopting new tools or patterns that emerge in the ecosystem
   - Monitoring how other Ink-based CLIs solve this problem

5. **Low Risk**: The manual workflow cannot break. Adding automation introduces risk of:
   - Restart loops
   - Lost terminal state
   - Platform-specific issues

### Root Cause Analysis

The core issue is a **fundamental incompatibility** between how process monitoring tools work and what TTY applications require:

```
Process Monitors (nodemon, tsx --watch):
  → Spawn child processes with stdin as PIPE
  → Reason: Need to monitor/control child stdin
  → Result: child.stdin.isTTY === false

TTY Applications (Ink):
  → Require process.stdin.isTTY === true
  → Reason: Need raw mode for keyboard input
  → Result: Cannot capture keys without TTY stdin
```

This is not a bug—it's an architectural constraint of Unix process spawning.

## Consequences

### Positive

- ✅ **No added complexity**: Simple `dev` script that always works
- ✅ **Predictable behavior**: Developer has full control over restarts
- ✅ **No maintenance burden**: No custom code or external tools to maintain
- ✅ **Reliable**: Cannot break or cause unexpected behavior
- ✅ **Clear documentation**: This ADR explains the decision and alternatives

### Negative

- ❌ **Slower iteration**: Manual restart takes time and breaks flow
- ❌ **Less ergonomic**: Requires more manual steps than web development
- ❌ **Cognitive overhead**: Must remember to restart after changes
- ❌ **Potential mistakes**: Developer might test old code if they forget to restart

### Neutral

- ⚪ **Alternative workarounds**: Developers can use external tools (watchexec) if they prefer
- ⚪ **Future improvements**: Can implement custom watcher when/if needed
- ⚪ **Industry pattern**: Other Ink-based CLIs face the same challenge

## Future Improvements

We remain open to improving the development workflow when feasible solutions emerge:

### Short-term
- **Document the workflow**: Ensure README clearly explains the manual restart process
- **Keep Issue #35 open**: Track this as a potential future enhancement
- **Monitor ecosystem**: Watch for solutions in other Ink-based CLIs

### Medium-term
- **Custom watcher (Option 5)**: Implement if the pain point becomes critical
  - Use chokidar for file watching
  - Use `spawn(..., { stdio: 'inherit' })` to preserve TTY
  - Handle edge cases (rapid changes, cleanup, signals)
  - Estimated effort: 1-2 days

### Long-term
- **Tool improvements**: Monitor tsx and nodemon for TTY support
- **Ink enhancements**: Watch for Ink improvements to support hot reload
- **Alternative frameworks**: Consider TUI frameworks with better DX tooling

### Signals to Revisit This Decision

Consider implementing a custom watcher when:
- Development team grows beyond 3-4 developers
- Development cycle becomes significantly slower
- Developers consistently request this feature
- A well-maintained npm package emerges that solves this
- Project scope expands requiring more frequent TUI changes

## Implementation Notes

### Current Development Workflow

The documented workflow for TUI development:

```bash
# Terminal 1: Run the TUI
pnpm dev

# Make changes in your editor

# Terminal 1: Quit and restart
# Press 'q' to quit
pnpm dev
```

### Optional: Using watchexec

Developers who want automatic restart can install watchexec:

```bash
# macOS
brew install watchexec

# Then use:
watchexec -r -e ts,tsx -- pnpm dev
```

This is **optional** and not documented in the main README to avoid requiring external tools.

## References

- [GitHub Issue #35: Hot reload/watch mode investigation](https://github.com/shimpeiws/mumbl/issues/35)
- [tsx issue #163: Watch mode triggers on stdin](https://github.com/privatenumber/tsx/issues/163)
- [nodemon issue #795: TTY stdin discussion](https://github.com/remy/nodemon/issues/795)
- [Ink documentation: isRawModeSupported](https://github.com/vadimdemedes/ink/#israwmodesupported)
- [Node.js TTY documentation](https://nodejs.org/api/tty.html)
- [Node.js child_process: stdio options](https://nodejs.org/api/child_process.html#child_process_options_stdio)
- [watchexec: Process execution tool](https://github.com/watchexec/watchexec)
- [chokidar: File watching library](https://github.com/paulmillr/chokidar)

## Decision Date

2026-01-28
