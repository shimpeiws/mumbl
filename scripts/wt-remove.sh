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
Usage: $(basename "$0") <issue-number-or-name>

Remove a git worktree and optionally delete its branch.

Arguments:
    issue-number-or-name    Issue number (e.g., 123) or full branch name
                           (e.g., issue-123-add-user-auth)

Examples:
    $(basename "$0") 123
    $(basename "$0") issue-123-add-user-auth

The script will:
    1. Find the matching worktree
    2. Check for uncommitted changes
    3. Confirm before removal
    4. Remove the worktree directory
    5. Optionally delete the branch (with confirmation)

Options:
    -h, --help      Show this help message
    -f, --force     Skip confirmations (use with caution)
EOF
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Check for force flag
FORCE=0
if [[ "$1" == "-f" || "$1" == "--force" ]]; then
    FORCE=1
    shift
fi

# Validate arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing required argument${NC}"
    echo
    show_help
    exit 1
fi

IDENTIFIER="$1"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")

# Determine branch name from identifier
if [[ "$IDENTIFIER" =~ ^[0-9]+$ ]]; then
    # It's a number, need to find the matching branch
    BRANCH_PATTERN="issue-${IDENTIFIER}-"
    MATCHING_BRANCHES=$(git branch --list "${BRANCH_PATTERN}*" | sed 's/^[*+ ]*//')

    if [ -z "$MATCHING_BRANCHES" ]; then
        echo -e "${RED}Error: No branch found matching issue #${IDENTIFIER}${NC}"
        exit 1
    fi

    BRANCH_COUNT=$(echo "$MATCHING_BRANCHES" | wc -l | tr -d ' ')
    if [ "$BRANCH_COUNT" -gt 1 ]; then
        echo -e "${RED}Error: Multiple branches found matching issue #${IDENTIFIER}:${NC}"
        echo "$MATCHING_BRANCHES"
        exit 1
    fi

    BRANCH_NAME=$(echo "$MATCHING_BRANCHES" | head -n 1)
else
    # Assume it's a full branch name
    BRANCH_NAME="$IDENTIFIER"
    # Add issue- prefix if not present
    if [[ ! "$BRANCH_NAME" =~ ^issue- ]]; then
        BRANCH_NAME="issue-${BRANCH_NAME}"
    fi
fi

# Check if branch exists
if ! git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo -e "${RED}Error: Branch '$BRANCH_NAME' does not exist${NC}"
    exit 1
fi

# Find the worktree for this branch
WORKTREE_PATH=$(git worktree list --porcelain | awk -v branch="refs/heads/$BRANCH_NAME" '
    /^worktree / { path = substr($0, 10) }
    /^branch / && $0 ~ branch { print path; exit }
')

if [ -z "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: No worktree found for branch '$BRANCH_NAME'${NC}"
    echo "The branch exists but is not associated with a worktree."
    echo "You may want to delete it manually with: git branch -d $BRANCH_NAME"
    exit 1
fi

# Check if we're currently in the worktree we're trying to remove
CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" == "$WORKTREE_PATH"* ]]; then
    echo -e "${RED}Error: Cannot remove the current worktree${NC}"
    echo "Please switch to a different directory first."
    echo "Suggestion: cd $REPO_ROOT"
    exit 1
fi

echo -e "${YELLOW}Worktree to remove:${NC}"
echo "  Path: $WORKTREE_PATH"
echo "  Branch: $BRANCH_NAME"
echo

# Check for uncommitted changes
cd "$WORKTREE_PATH"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠ Warning: Worktree has uncommitted changes!${NC}"
    git status --short
    echo

    if [ $FORCE -eq 0 ]; then
        read -p "Continue with removal? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Removal cancelled."
            exit 0
        fi
    fi
fi

# Return to original directory
cd "$CURRENT_DIR"

# Confirm removal
if [ $FORCE -eq 0 ]; then
    read -p "Remove this worktree? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Removal cancelled."
        exit 0
    fi
fi

# Remove the worktree
echo -e "${YELLOW}Removing worktree...${NC}"
git worktree remove "$WORKTREE_PATH" --force

echo -e "${GREEN}✓ Worktree removed${NC}"
echo

# Ask about branch deletion
if [ $FORCE -eq 0 ]; then
    read -p "Delete the branch '$BRANCH_NAME'? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Check if branch is merged
        if git branch --merged | grep -q "^[* ]*${BRANCH_NAME}$"; then
            git branch -d "$BRANCH_NAME"
            echo -e "${GREEN}✓ Branch deleted${NC}"
        else
            echo -e "${YELLOW}⚠ Branch is not fully merged${NC}"
            read -p "Force delete? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git branch -D "$BRANCH_NAME"
                echo -e "${GREEN}✓ Branch force deleted${NC}"
            else
                echo "Branch kept."
            fi
        fi
    else
        echo "Branch kept."
    fi
else
    # Force mode - try to delete the branch
    if git branch --merged | grep -q "^[* ]*${BRANCH_NAME}$"; then
        git branch -d "$BRANCH_NAME"
        echo -e "${GREEN}✓ Branch deleted${NC}"
    else
        git branch -D "$BRANCH_NAME"
        echo -e "${GREEN}✓ Branch force deleted${NC}"
    fi
fi

echo
echo -e "${GREEN}Cleanup complete!${NC}"
