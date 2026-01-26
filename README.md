# mumbl

Git worktree management utilities for parallel issue development.

## Overview

mumbl provides a set of bash scripts to manage git worktrees, enabling you to work on multiple issues simultaneously without the need to switch branches. Each issue gets its own isolated worktree in a sibling directory, allowing parallel development while sharing the same git repository.

## Features

- **No branch switching** - Work on multiple issues without `git checkout`
- **Parallel development** - Multiple issues active simultaneously
- **Isolated environments** - Each worktree maintains its own working directory and uncommitted changes
- **Shared git history** - All worktrees share the same `.git` directory, saving disk space
- **Simple workflow** - Intuitive commands for creating, listing, navigating, and removing worktrees

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Git >= 2.5.0 (for worktree support)

## Installation

```bash
git clone https://github.com/shimpeiws/mumbl.git
cd mumbl
pnpm install
```

## Usage

All worktree management is done via bash scripts in the `scripts/` directory:

### Create a worktree for an issue

```bash
./scripts/wt-create.sh <issue-number> <title-slug>
```

Example:
```bash
./scripts/wt-create.sh 123 add-user-auth
# Creates: ../mumbl-issue-123-add-user-auth/
# Branch: issue-123-add-user-auth
```

### List all worktrees

```bash
./scripts/wt-list.sh
```

### Navigate to a worktree

```bash
cd $(./scripts/wt-goto.sh <issue-number>)
```

Example:
```bash
cd $(./scripts/wt-goto.sh 123)
```

### Remove a worktree

```bash
./scripts/wt-remove.sh <issue-number>
```

Example:
```bash
./scripts/wt-remove.sh 123
```

### Shell integration (optional)

Add this to your `~/.bashrc` or `~/.zshrc` for easier navigation:

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

Then simply use:
```bash
wt 123  # Navigate to issue #123's worktree
```

## Development

This project is transitioning to TypeScript while maintaining the bash script interface.

### Available scripts

```bash
# Development mode with watch
pnpm dev

# Type checking
pnpm type-check

# Build TypeScript
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format

# Lint and format (combined)
pnpm check

# CI validation
pnpm ci:check
```

## Project Structure

```
mumbl/
├── scripts/           # Bash worktree management utilities
│   ├── wt-create.sh  # Create worktree
│   ├── wt-list.sh    # List worktrees
│   ├── wt-goto.sh    # Navigate to worktree
│   └── wt-remove.sh  # Remove worktree
├── src/              # TypeScript source (in development)
│   ├── index.ts
│   └── types/
└── CLAUDE.md         # Comprehensive workflow documentation
```

## Documentation

- **README.md** (this file) - Quick start and overview
- **CLAUDE.md** - Comprehensive workflow guide, troubleshooting, and best practices

## Roadmap

- [ ] TypeScript CLI implementation
- [ ] Configuration file support
- [ ] Interactive worktree selection
- [ ] Cross-platform compatibility improvements

## License

MIT
