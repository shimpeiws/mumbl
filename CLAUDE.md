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

No special setup is required. The scripts are ready to use immediately. However, for easier navigation, consider adding this shell function to your `~/.bashrc` or `~/.zshrc`:

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
