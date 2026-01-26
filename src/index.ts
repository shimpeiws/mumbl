/**
 * mumbl - Git worktree management utilities
 *
 * This is a placeholder entry point for the TypeScript implementation.
 * The actual worktree management is currently handled by bash scripts in scripts/
 *
 * Roadmap:
 * - Implement TypeScript API for worktree operations
 * - Add CLI interface using a command-line parser
 * - Support configuration files
 * - Interactive worktree selection
 */

import type { CreateOptions, RemoveOptions, Worktree } from './types/index.js';

export type { CreateOptions, RemoveOptions, Worktree };

/**
 * Placeholder function - TypeScript implementation coming soon
 */
function main(): void {
  console.log('mumbl - Git worktree management utilities');
  console.log('');
  console.log('Current implementation uses bash scripts in scripts/');
  console.log('TypeScript implementation is under development.');
  console.log('');
  console.log('Available commands:');
  console.log('  ./scripts/wt-create.sh <issue-number> <title-slug>');
  console.log('  ./scripts/wt-list.sh');
  console.log('  ./scripts/wt-goto.sh <issue-number>');
  console.log('  ./scripts/wt-remove.sh <issue-number>');
}

main();
