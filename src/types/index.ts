/**
 * Type definitions for git worktree management
 */

/**
 * Represents a git worktree
 */
export interface Worktree {
  /** Absolute path to the worktree directory */
  path: string;
  /** Branch name checked out in this worktree */
  branch: string;
  /** HEAD commit SHA */
  head: string;
  /** Whether this is the main/primary worktree */
  isMain: boolean;
  /** Whether this is a detached HEAD */
  isDetached: boolean;
}

/**
 * Represents a git repository
 */
export interface Repository {
  /** Absolute path to the repository root */
  root: string;
  /** Repository name (directory name) */
  name: string;
  /** Main branch name (main or master) */
  mainBranch: string;
}

/**
 * Options for creating a new worktree
 */
export interface CreateOptions {
  /** Issue number */
  issueNumber: number;
  /** Title slug (e.g., 'add-user-auth') */
  titleSlug: string;
  /** Base branch to create from (defaults to main/master) */
  baseBranch?: string;
}

/**
 * Options for removing a worktree
 */
export interface RemoveOptions {
  /** Issue number or branch name */
  target: string;
  /** Force removal without confirmation */
  force?: boolean;
  /** Delete the branch after removing worktree */
  deleteBranch?: boolean;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };
