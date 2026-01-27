#!/usr/bin/env bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Help text
show_help() {
    cat << EOF
Usage: $(basename "$0") <issue-number> <title-slug>

Create a new git worktree for an issue.

Arguments:
    issue-number    The issue number (e.g., 123)
    title-slug      Descriptive slug for the issue (e.g., add-user-auth)

Example:
    $(basename "$0") 123 add-user-auth

This creates:
    - Worktree directory: ../mumbl-issue-123-add-user-auth/
    - Branch name: issue-123-add-user-auth

Options:
    -h, --help      Show this help message
EOF
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Validate arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo
    show_help
    exit 1
fi

ISSUE_NUMBER="$1"
TITLE_SLUG="$2"

# Validate issue number is numeric
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: Issue number must be numeric${NC}"
    exit 1
fi

# Validate title slug (alphanumeric and hyphens only)
if ! [[ "$TITLE_SLUG" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}Error: Title slug must contain only lowercase letters, numbers, and hyphens${NC}"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get the repository root and name
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")

# Check if repository has any commits
if ! git rev-parse HEAD >/dev/null 2>&1; then
    echo -e "${RED}Error: Repository has no commits yet${NC}"
    echo "Please create an initial commit before creating worktrees:"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    exit 1
fi

# Determine main branch (main or master)
MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -z "$MAIN_BRANCH" ]; then
    MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
fi
if ! git show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
    MAIN_BRANCH="master"
    if ! git show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
        echo -e "${RED}Error: Could not determine main branch (tried 'main' and 'master')${NC}"
        exit 1
    fi
fi

# Construct names
BRANCH_NAME="issue-${ISSUE_NUMBER}-${TITLE_SLUG}"
WORKTREE_DIR="${REPO_ROOT}/../${REPO_NAME}-issue-${ISSUE_NUMBER}-${TITLE_SLUG}"

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo -e "${RED}Error: Branch '$BRANCH_NAME' already exists${NC}"
    exit 1
fi

# Check if worktree directory already exists
if [ -d "$WORKTREE_DIR" ]; then
    echo -e "${RED}Error: Directory '$WORKTREE_DIR' already exists${NC}"
    exit 1
fi

# Create the worktree
echo -e "${YELLOW}Creating worktree for issue #${ISSUE_NUMBER}...${NC}"
echo "  Branch: $BRANCH_NAME"
echo "  Location: $WORKTREE_DIR"
echo

git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "$MAIN_BRANCH"

echo
echo -e "${GREEN}✓ Worktree created successfully!${NC}"
echo
echo "To switch to the new worktree:"
echo "  cd $WORKTREE_DIR"
echo
echo "Or use:"
echo "  cd \$(./scripts/wt-goto.sh $ISSUE_NUMBER)"
