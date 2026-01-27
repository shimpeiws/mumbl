# Git Worktree Workflow

This document describes the git worktree workflow for managing multiple issues in parallel.

## Overview

This repository uses git worktrees to enable working on multiple issues simultaneously without switching branches. Each issue gets its own worktree in a sibling directory, allowing you to maintain separate working directories while sharing the same git repository.

### Benefits

- **No branch switching**: Work on multiple issues without `git checkout`
- **Parallel development**: Multiple issues can be active simultaneously
- **Isolated environments**: Each worktree has its own working directory and index
- **Shared git history**: All worktrees share the same `.git` directory, saving disk space
- **Clean state**: Each issue maintains its own uncommitted changes

## Directory Structure

```
~/src/github.com/shimpeiws/
├── mumbl/                          # Main repository (primary worktree)
│   ├── .git/
│   ├── scripts/
│   │   ├── wt-create.sh
│   │   ├── wt-list.sh
│   │   ├── wt-remove.sh
│   │   └── wt-goto.sh
│   └── ...
├── mumbl-issue-123-add-user-auth/  # Worktree for issue #123
├── mumbl-issue-456-fix-login-bug/  # Worktree for issue #456
└── mumbl-issue-789-update-readme/  # Worktree for issue #789
```

## Initial Setup

### Prerequisites

- **Git** >= 2.5.0 (for worktree support)
- **Node.js** >= 20.0.0 (for TypeScript development)
- **pnpm** >= 9.0.0 (package manager)

### Quick Start

The bash scripts are ready to use immediately without any setup. However, if you plan to contribute to the TypeScript codebase, you'll need to install dependencies:

```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
pnpm install
```

### Shell Integration

For easier navigation, consider adding this shell function to your `~/.bashrc` or `~/.zshrc`:

```bash
# Quick worktree navigation
wt() {
    local repo_dir="/Users/shin/src/github.com/shimpeiws/mumbl"
    cd "$repo_dir"
    local target=$(./scripts/wt-goto.sh "$1")
    if [ $? -eq 0 ]; then
        cd "$target"
    fi
}
```

Then you can simply use: `wt 123` to switch to issue #123's worktree.

## Commands Reference

### Create a Worktree: `wt-create.sh`

Creates a new worktree for an issue.

**Usage:**
```bash
./scripts/wt-create.sh <issue-number> <title-slug>
```

**Arguments:**
- `issue-number`: The issue number (numeric, e.g., `123`)
- `title-slug`: Descriptive slug using lowercase letters, numbers, and hyphens (e.g., `add-user-auth`)

**Example:**
```bash
./scripts/wt-create.sh 123 add-user-auth
```

This creates:
- Branch: `issue-123-add-user-auth`
- Directory: `../mumbl-issue-123-add-user-auth/`
- Base: Current main/master branch

**Notes:**
- The script automatically detects whether your repository uses `main` or `master`
- Validates that the branch and directory don't already exist
- Creates the branch based on the latest main/master branch

### List Worktrees: `wt-list.sh`

Lists all active worktrees in the repository.

**Usage:**
```bash
./scripts/wt-list.sh
```

**Output:**
- Displays all worktrees with their paths and branch names
- Highlights the current worktree with a `*` marker
- Shows the main repository and all issue worktrees

**Example output:**
```
Git Worktrees:

* /Users/shin/src/github.com/shimpeiws/mumbl
    Branch: main

  /Users/shin/src/github.com/shimpeiws/mumbl-issue-123-add-user-auth
    Branch: issue-123-add-user-auth

  /Users/shin/src/github.com/shimpeiws/mumbl-issue-456-fix-login-bug
    Branch: issue-456-fix-login-bug
```

### Navigate to a Worktree: `wt-goto.sh`

Outputs the path to a worktree for use with `cd`.

**Usage:**
```bash
cd $(./scripts/wt-goto.sh <issue-number-or-name>)
```

**Arguments:**
- `issue-number-or-name`: Either the issue number (e.g., `123`) or full branch name (e.g., `issue-123-add-user-auth`)

**Examples:**
```bash
# Using issue number
cd $(./scripts/wt-goto.sh 123)

# Using full branch name
cd $(./scripts/wt-goto.sh issue-123-add-user-auth)
```

**Tip:** Add the shell function from the Initial Setup section for easier usage: `wt 123`

### Remove a Worktree: `wt-remove.sh`

Removes a worktree and optionally deletes its branch.

**Usage:**
```bash
./scripts/wt-remove.sh <issue-number-or-name>
```

**Arguments:**
- `issue-number-or-name`: Either the issue number or full branch name

**Options:**
- `-f, --force`: Skip all confirmations (use with caution)

**Examples:**
```bash
# Interactive removal with confirmations
./scripts/wt-remove.sh 123

# Force removal without prompts
./scripts/wt-remove.sh --force 123

# Using full branch name
./scripts/wt-remove.sh issue-123-add-user-auth
```

**The script will:**
1. Find the matching worktree
2. Check for uncommitted changes and warn if found
3. Confirm before removing the worktree
4. Remove the worktree directory
5. Ask whether to delete the branch
6. Check if the branch is merged before deletion
7. Offer force deletion for unmerged branches

**Safety features:**
- Prevents removing the worktree you're currently in
- Warns about uncommitted changes
- Confirms before destructive operations
- Checks if branch is merged before deletion

## Common Workflows

### Starting Work on a New Issue

1. Create a worktree for the issue:
   ```bash
   ./scripts/wt-create.sh 123 add-user-authentication
   ```

2. Navigate to the new worktree:
   ```bash
   cd $(./scripts/wt-goto.sh 123)
   # Or use: wt 123 (if you set up the shell function)
   ```

3. Start working:
   ```bash
   # You're now in the issue-123-add-user-authentication branch
   # Make your changes, commit, push, etc.
   git status
   ```

### Switching Between Issues

**From anywhere in the filesystem:**
```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
cd $(./scripts/wt-goto.sh 456)
```

**Using the shell function (if configured):**
```bash
wt 456
```

**List all active issues:**
```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
./scripts/wt-list.sh
```

### Completing an Issue

1. Return to the main repository:
   ```bash
   cd /Users/shin/src/github.com/shimpeiws/mumbl
   ```

2. Remove the worktree:
   ```bash
   ./scripts/wt-remove.sh 123
   ```

3. Follow the prompts to:
   - Confirm worktree removal
   - Optionally delete the branch (if merged to main)

### Working on Multiple Issues Simultaneously

The power of worktrees is that you can have multiple issues active at once:

```bash
# Terminal 1: Working on issue #123
cd $(./scripts/wt-goto.sh 123)
npm run dev

# Terminal 2: Working on issue #456
cd $(./scripts/wt-goto.sh 456)
npm test

# Terminal 3: Reviewing code in main
cd /Users/shin/src/github.com/shimpeiws/mumbl
git log
```

Each worktree maintains its own:
- Working directory state
- Staged changes
- Untracked files
- Running processes

### Cleaning Up Multiple Worktrees

```bash
# List all worktrees
./scripts/wt-list.sh

# Remove completed worktrees one by one
./scripts/wt-remove.sh 123
./scripts/wt-remove.sh 456

# Or use force mode for merged branches
./scripts/wt-remove.sh --force 789
```

## Naming Conventions

### Branch Names
Format: `issue-{number}-{title-slug}`

Examples:
- `issue-123-add-user-auth`
- `issue-456-fix-login-bug`
- `issue-789-update-readme`

### Directory Names
Format: `{repo-name}-issue-{number}-{title-slug}`

Examples:
- `mumbl-issue-123-add-user-auth`
- `mumbl-issue-456-fix-login-bug`
- `mumbl-issue-789-update-readme`

### Title Slug Guidelines
- Use lowercase letters only
- Separate words with hyphens
- Keep it concise but descriptive
- Use only alphanumeric characters and hyphens
- Examples: `add-feature`, `fix-bug`, `update-docs`, `refactor-api`

## Troubleshooting

### "Error: Not in a git repository"

**Cause:** You're running the script from outside the repository.

**Solution:** Navigate to the repository first:
```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
./scripts/wt-create.sh 123 feature-name
```

### "Error: Branch already exists"

**Cause:** A branch with that name already exists.

**Solutions:**
1. List existing worktrees: `./scripts/wt-list.sh`
2. Use a different issue number or title slug
3. If the old worktree is no longer needed, remove it first: `./scripts/wt-remove.sh <number>`

### "Error: Cannot remove the current worktree"

**Cause:** You're trying to remove the worktree you're currently in.

**Solution:** Navigate to a different directory first:
```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
./scripts/wt-remove.sh 123
```

### "Error: Multiple branches found"

**Cause:** Multiple branches match the issue number (e.g., `issue-123-feature-a` and `issue-123-feature-b`).

**Solution:** Use the full branch name instead of just the number:
```bash
./scripts/wt-goto.sh issue-123-feature-a
# or
./scripts/wt-remove.sh issue-123-feature-a
```

### Worktree has uncommitted changes

**Cause:** The worktree you're trying to remove has uncommitted changes.

**Solutions:**
1. Navigate to the worktree and commit or stash the changes:
   ```bash
   cd $(./scripts/wt-goto.sh 123)
   git add .
   git commit -m "Save work"
   # or
   git stash
   ```

2. Use force removal (⚠️ will lose changes):
   ```bash
   ./scripts/wt-remove.sh --force 123
   ```

### Branch is not fully merged

**Cause:** The branch has commits that haven't been merged to main.

**Solutions:**
1. Merge the branch first:
   ```bash
   git checkout main
   git merge issue-123-feature-name
   git push
   ```

2. Force delete if you're sure:
   ```bash
   ./scripts/wt-remove.sh 123
   # Then choose "y" when asked to force delete
   ```

### Stale worktrees after manual deletion

**Cause:** Worktree directory was deleted manually without using `wt-remove.sh`.

**Solution:** Clean up git's worktree references:
```bash
git worktree prune
```

## Tips and Best Practices

### 1. Use Descriptive Title Slugs
Good: `add-oauth-provider`, `fix-memory-leak`, `refactor-auth-flow`
Bad: `fix`, `update`, `changes`

### 2. Keep the Main Repository Clean
- Use the main repository (`/Users/shin/src/github.com/shimpeiws/mumbl`) for:
  - Running scripts
  - Reviewing git history
  - Updating main branch
- Do feature work in issue worktrees

### 3. Clean Up Regularly
- Remove worktrees after issues are merged
- Use `./scripts/wt-list.sh` regularly to see active worktrees
- Don't accumulate too many worktrees

### 4. Branch Management
- Always branch from an up-to-date main/master
- Update main before creating new worktrees:
  ```bash
  git checkout main
  git pull
  ```

### 5. Shell Function for Speed
Add this to your shell config for quick navigation:
```bash
wt() {
    local repo_dir="/Users/shin/src/github.com/shimpeiws/mumbl"
    cd "$repo_dir"
    local target=$(./scripts/wt-goto.sh "$1")
    if [ $? -eq 0 ]; then
        cd "$target"
    fi
}
```

### 6. Terminal Multiplexing
Worktrees work great with tmux or terminal tabs:
- One terminal for each active issue
- Easy context switching
- Run different dev servers simultaneously

### 7. Avoid Shared Resources
Be careful when multiple worktrees:
- Use different ports for dev servers
- Use different database instances
- Don't run the same build process simultaneously

### 8. Git Commands Work Normally
Inside each worktree, use git as usual:
```bash
git add .
git commit -m "message"
git push
git status
git log
```

All worktrees share the same repository, so:
- Commits in one worktree are visible in others
- Fetching in one worktree updates all
- Tags and remotes are shared

## Advanced Usage

### Creating a Worktree from a Different Branch

The scripts create branches from main by default. To create from a different base:

```bash
# Create the branch manually first
git branch issue-123-hotfix origin/release-v2

# Then create the worktree
git worktree add ../mumbl-issue-123-hotfix issue-123-hotfix
```

### Temporary Worktrees for Quick Tasks

For quick tests or experiments, you can create a worktree without using the scripts:

```bash
# Create a temporary worktree with detached HEAD
git worktree add -d ../mumbl-temp HEAD

# Do your work
cd ../mumbl-temp
# ... test something ...

# Clean up
cd /Users/shin/src/github.com/shimpeiws/mumbl
git worktree remove ../mumbl-temp
```

### Listing Worktrees with Git Directly

```bash
# Simple list
git worktree list

# Detailed porcelain format
git worktree list --porcelain
```

### Moving a Worktree

If you need to move a worktree to a different location:

```bash
# Move the directory
mv ../mumbl-issue-123-feature ../new-location/mumbl-issue-123-feature

# Update git's reference
git worktree repair ../new-location/mumbl-issue-123-feature
```

## Development Environment

This project is transitioning to TypeScript while maintaining the bash script interface as the primary user-facing tool.

### Technology Stack

- **TypeScript** 5.7+ with strict mode enabled
- **Biome** for linting and formatting (replaces ESLint + Prettier)
- **tsx** for development and testing
- **pnpm** as package manager

### Project Structure

```
mumbl/
├── .gitignore          # Version control exclusions
├── package.json        # Project metadata and scripts
├── pnpm-lock.yaml      # Dependency lockfile
├── tsconfig.json       # TypeScript configuration
├── biome.json          # Linting and formatting rules
├── README.md           # User-facing documentation
├── CLAUDE.md           # This file - workflow documentation
├── scripts/            # Bash worktree management utilities
│   ├── wt-create.sh
│   ├── wt-list.sh
│   ├── wt-goto.sh
│   └── wt-remove.sh
├── src/                # TypeScript source code
│   ├── index.ts        # Entry point
│   └── types/          # Type definitions
│       └── index.ts
└── dist/               # Compiled output (gitignored)
```

### Development Scripts

All development commands are available via pnpm:

#### Development Mode
```bash
pnpm dev
```
Runs TypeScript code with watch mode. Automatically restarts when files change.

#### Type Checking
```bash
pnpm type-check
```
Validates TypeScript types without emitting files. Useful for CI/CD.

#### Building
```bash
pnpm build
```
Compiles TypeScript to JavaScript in the `dist/` directory.

#### Linting
```bash
pnpm lint
```
Runs Biome linter on the `src/` directory.

#### Formatting
```bash
pnpm format
```
Formats code using Biome's formatter.

#### Combined Check
```bash
pnpm check
```
Runs both linting and formatting with auto-fix.

#### CI Validation
```bash
pnpm ci:check
```
Validates code quality without auto-fixing. Used in CI/CD pipelines.

### Code Quality Standards

The project enforces strict TypeScript and code quality standards:

- **Strict TypeScript**: All strict compiler options enabled
- **No implicit any**: Type annotations required
- **Unused variables**: Not allowed
- **Index access**: Must be checked for undefined
- **Line width**: 100 characters maximum
- **Formatting**: Single quotes, 2-space indent, trailing commas

### Development Workflow

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Make changes**:
   - Edit TypeScript files in `src/`
   - Follow existing code patterns

3. **Run checks during development**:
   ```bash
   pnpm dev  # Watch mode
   ```

4. **Before committing**:
   ```bash
   pnpm type-check  # Ensure no type errors
   pnpm check       # Lint and format
   pnpm build       # Verify it compiles
   ```

5. **Commit changes**:
   - Use conventional commit messages
   - Ensure all checks pass
   - See Commit Guidelines below for details

### Commit Guidelines

When creating commits for this project:

#### Message Format

Use clear, descriptive commit messages that explain what changed and why:

```
Add TypeScript and Biome setup with project infrastructure

Implement issue #1 by setting up TypeScript development environment.

Changes:
- Add package.json with TypeScript, Biome, and tsx dependencies
- Add tsconfig.json with strict mode configuration
- Add biome.json for code quality and formatting
- Add README.md with project overview and usage guide
```

#### Important Rules

- **DO NOT** include `Co-Authored-By` lines in commit messages
- Use imperative mood in subject line ("Add feature" not "Added feature")
- Keep subject line under 72 characters
- Separate subject from body with blank line
- Wrap body at 72 characters
- Reference issue numbers when applicable (e.g., "Implement issue #1")

#### Examples

**Good:**
```
Fix branch matching to handle '+' marker in git output

Update wt-goto.sh and wt-remove.sh to strip both '*' and '+'
markers from git branch output when matching issue numbers.
```

**Bad:**
```
fixed stuff

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Pull Request Guidelines

When creating pull requests:

#### PR Description Format

Structure your PR description with clear sections:

```markdown
## Summary

Brief overview of what this PR does and which issue it addresses.

- Key change 1
- Key change 2
- Key change 3

## Changes

- **file1.ts**: Description of changes
- **file2.ts**: Description of changes

## Test plan

- [ ] Test item 1
- [ ] Test item 2
```

#### Important Rules

- **DO NOT** include signature lines like "🤖 Generated with Claude Code" or similar AI-generated footers
- Reference the issue number in the summary (e.g., "Implements issue #1")
- List all significant file changes
- Include a test plan with verification steps
- Keep descriptions concise but complete

#### Examples

**Good:**
```markdown
## Summary

Implements issue #1 by setting up TypeScript infrastructure.

- TypeScript with strict mode
- Biome for linting and formatting
- Complete project documentation

## Test plan

- [x] pnpm install completes successfully
- [x] All type checks pass
```

**Bad:**
```markdown
Added some stuff

🤖 Generated with Claude Code
```

### Contributing to TypeScript Codebase

The TypeScript implementation is in early stages. The roadmap includes:

- TypeScript API for worktree operations
- CLI interface with command-line parser
- Configuration file support (e.g., `.mumblrc`)
- Interactive worktree selection
- Cross-platform compatibility improvements

When contributing:
- Maintain backward compatibility with bash scripts
- Add tests for new functionality
- Update documentation for user-facing changes
- Follow existing code patterns and conventions

## Testing Guidelines

The project uses [Vitest](https://vitest.dev/) for comprehensive testing with strict coverage requirements.

### Test Organization

Tests follow a co-location strategy inspired by Go:

```
mumbl/
├── src/
│   ├── index.ts              # Source file
│   ├── index.test.ts         # Co-located unit test
│   └── worktree/             # Future: worktree module
│       ├── create.ts
│       ├── create.test.ts    # Co-located test
│       ├── list.ts
│       └── list.test.ts      # Co-located test
├── test/
│   ├── integration/          # Cross-module integration tests
│   ├── e2e/                  # End-to-end CLI/TUI tests
│   ├── fixtures/             # Test data and fixtures
│   └── helpers/              # Shared test utilities
└── coverage/                 # Generated coverage reports (gitignored)
```

**Why Co-location?**
- Easy to find tests (right next to the source)
- Clear 1:1 relationship between source and test
- Reduces context switching during development
- Tests included in IDE file navigation

### Test Types

**Unit Tests** (`*.test.ts` co-located with source)
- Test individual functions and classes in isolation
- Mock external dependencies
- Fast execution (< 100ms per test)
- Example: `src/index.test.ts`

**Integration Tests** (`test/integration/`)
- Test interactions between multiple modules
- Use in-memory mocks (memfs for filesystem)
- Verify complete workflows
- Example: `test/integration/worktree-flow.test.ts`

**E2E Tests** (`test/e2e/`)
- Test complete user journeys through CLI/TUI
- Use ink-testing-library for TUI testing (when implemented)
- Verify end-user experience
- Example: `test/e2e/cli-commands.test.ts`

### Writing Tests

**Basic Test Structure**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { functionToTest } from './module.js';

describe('functionToTest', () => {
  it('should perform expected behavior', () => {
    // Arrange: Set up test data
    const input = 'test';

    // Act: Execute the function
    const result = functionToTest(input);

    // Assert: Verify the result
    expect(result).toBe('expected');
  });
});
```

**Mocking**

```typescript
// Mock console.log
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock shell commands (use test utilities)
import { mockExecSync } from '../helpers/test-utils.js';
const execSpy = mockExecSync('git status', 'output');

// Clean up after test
afterEach(() => {
  vi.restoreAllMocks();
});
```

**Using Test Utilities**

```typescript
import { createMockGitRepo, cleanupMockFs } from '../helpers/test-utils.js';

describe('git operations', () => {
  let cleanup: () => void;

  beforeEach(() => {
    // Create mock git repository
    cleanup = createMockGitRepo('/test-repo');
  });

  afterEach(() => {
    // Clean up mock filesystem
    cleanup();
    cleanupMockFs();
  });

  it('should work with mock repo', () => {
    // Test git operations using mock filesystem
  });
});
```

### Test Commands

```bash
# Development (watch mode)
pnpm test

# Run specific test types
pnpm test:unit          # Unit tests only (src/)
pnpm test:integration   # Integration tests
pnpm test:e2e           # E2E tests

# Coverage
pnpm test:coverage      # Generate coverage report
open coverage/index.html # View coverage in browser

# CI mode
pnpm ci:test            # Tests with coverage for CI
pnpm ci:all             # All checks (type-check + lint + test)
```

### Coverage Requirements

Strict coverage thresholds enforced by Vitest:
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

**Coverage will fail the build if thresholds are not met.**

### Best Practices

**1. Test Naming**
- Use descriptive test names that explain behavior
- Start with "should" for behavior tests
- Use "it.todo" for placeholder tests

```typescript
// Good
it('should create worktree with valid issue number', () => {});
it('should throw error when branch already exists', () => {});

// Bad
it('test 1', () => {});
it('worktree', () => {});
```

**2. Test Organization**
- Group related tests with `describe` blocks
- Use `beforeEach`/`afterEach` for setup/cleanup
- Keep tests independent (no shared state)

**3. Assertions**
- Use specific assertions (`toBe`, `toEqual`, `toThrow`)
- Test both success and error cases
- Verify error messages, not just that errors occur

```typescript
// Good
expect(() => createWorktree(-1)).toThrow('Issue number must be positive');

// Bad
expect(() => createWorktree(-1)).toThrow();
```

**4. Mocking Guidelines**
- Mock external dependencies (filesystem, network, etc.)
- Use real implementations for internal modules when possible
- Clean up mocks after each test

**5. Test Data**
- Use fixtures for complex test data (`test/fixtures/`)
- Use factory functions for test object creation
- Keep test data minimal and focused

**6. Async Testing**
- Use `async`/`await` for async tests
- Set appropriate timeouts (default: 10000ms)
- Test error handling in async code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### Running Tests in CI

GitHub Actions runs tests automatically on push and PR:

**Jobs:**
1. **Type Check** - Validates TypeScript types
2. **Lint** - Runs Biome linter
3. **Test** - Matrix: Node 20, 22 with coverage
4. **Build** - Verifies successful build

**Coverage:**
- Uploaded to Codecov (requires `CODECOV_TOKEN` secret)
- Archived as GitHub Actions artifact

### Debugging Tests

**Run specific test file:**
```bash
pnpm vitest src/index.test.ts
```

**Run tests matching pattern:**
```bash
pnpm vitest -t "should create worktree"
```

**Debug with VS Code:**
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test:run"],
  "console": "integratedTerminal"
}
```

### Continuous Testing

Use watch mode during development:
```bash
pnpm test
```

Vitest will:
- Re-run tests when files change
- Show only failed tests after first run
- Provide instant feedback

### Future Enhancements

**Planned improvements:**
- ink-testing-library for TUI testing
- Snapshot tests for TUI components
- Performance benchmarks using Vitest bench
- Pre-commit hooks with Husky
- Mutation testing with Stryker
- Visual regression testing

## Help

All scripts support the `--help` flag for quick reference:

```bash
./scripts/wt-create.sh --help
./scripts/wt-list.sh --help
./scripts/wt-goto.sh --help
./scripts/wt-remove.sh --help
```

## See Also

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git Worktree Tutorial](https://git-scm.com/book/en/v2/Git-Tools-Worktrees)
