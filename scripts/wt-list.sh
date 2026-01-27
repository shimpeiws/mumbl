#!/usr/bin/env bash

set -e

# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Help text
show_help() {
    cat << EOF
Usage: $(basename "$0")

List all git worktrees for this repository.

The current worktree is highlighted with an asterisk (*).

Options:
    -h, --help      Show this help message
EOF
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Get current directory to highlight current worktree
CURRENT_DIR=$(pwd)

echo -e "${CYAN}Git Worktrees:${NC}"
echo

# Parse git worktree list output
git worktree list --porcelain | awk -v current="$CURRENT_DIR" -v green="$GREEN" -v yellow="$YELLOW" -v nc="$NC" '
BEGIN {
    worktree = ""
    branch = ""
    is_current = 0
}

/^worktree / {
    if (worktree != "") {
        # Print previous worktree
        marker = (is_current ? green "* " : "  ")
        printf "%s%s%s\n", marker, worktree, nc
        if (branch != "") {
            printf "    Branch: %s\n", branch
        }
        printf "\n"
    }
    worktree = substr($0, 10)
    is_current = (worktree == current)
    branch = ""
}

/^branch / {
    branch = substr($0, index($0, "refs/heads/") + 11)
}

/^detached$/ {
    branch = "(detached HEAD)"
}

END {
    # Print last worktree
    if (worktree != "") {
        marker = (is_current ? green "* " : "  ")
        printf "%s%s%s\n", marker, worktree, nc
        if (branch != "") {
            printf "    Branch: %s\n", branch
        }
    }
}'

echo
echo -e "${YELLOW}Tip:${NC} Use 'cd \$(./scripts/wt-goto.sh <issue-number>)' to switch to a worktree"
