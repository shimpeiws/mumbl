#!/usr/bin/env bash

set -e

# Help text
show_help() {
    cat << EOF
Usage: cd \$($(basename "$0") <issue-number-or-name>)

Output the path to a worktree for easy navigation.

Arguments:
    issue-number-or-name    Issue number (e.g., 123) or full branch name
                           (e.g., issue-123-add-user-auth)

Examples:
    cd \$($(basename "$0") 123)
    cd \$($(basename "$0") issue-123-add-user-auth)

Note: This script outputs a path. Use it with cd and command substitution \$()
      as shown in the examples above.

Shell Function Alternative:
    Add this to your ~/.bashrc or ~/.zshrc for easier usage:

    wt() {
        cd \$(./scripts/wt-goto.sh "\$1")
    }

    Then use: wt 123

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
if [ $# -lt 1 ]; then
    echo "Error: Missing required argument" >&2
    echo "Usage: cd \$($(basename "$0") <issue-number-or-name>)" >&2
    exit 1
fi

IDENTIFIER="$1"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository" >&2
    exit 1
fi

# Determine branch name from identifier
if [[ "$IDENTIFIER" =~ ^[0-9]+$ ]]; then
    # It's a number, need to find the matching branch
    BRANCH_PATTERN="issue-${IDENTIFIER}-"
    MATCHING_BRANCHES=$(git branch --list "${BRANCH_PATTERN}*" | sed 's/^[*+ ]*//')

    if [ -z "$MATCHING_BRANCHES" ]; then
        echo "Error: No branch found matching issue #${IDENTIFIER}" >&2
        exit 1
    fi

    BRANCH_COUNT=$(echo "$MATCHING_BRANCHES" | wc -l | tr -d ' ')
    if [ "$BRANCH_COUNT" -gt 1 ]; then
        echo "Error: Multiple branches found matching issue #${IDENTIFIER}:" >&2
        echo "$MATCHING_BRANCHES" >&2
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
    echo "Error: Branch '$BRANCH_NAME' does not exist" >&2
    exit 1
fi

# Find the worktree for this branch
WORKTREE_PATH=$(git worktree list --porcelain | awk -v branch="refs/heads/$BRANCH_NAME" '
    /^worktree / { path = substr($0, 10) }
    /^branch / && $0 ~ branch { print path; exit }
')

if [ -z "$WORKTREE_PATH" ]; then
    echo "Error: No worktree found for branch '$BRANCH_NAME'" >&2
    exit 1
fi

# Output the path (this is what cd will use)
echo "$WORKTREE_PATH"
