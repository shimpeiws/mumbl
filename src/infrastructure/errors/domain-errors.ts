/**
 * Base error class for all storage-related errors
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Thrown when a requested entry is not found
 */
export class EntryNotFoundError extends StorageError {
  constructor(id: string) {
    super(`Entry not found: ${id}`);
    this.name = 'EntryNotFoundError';
  }
}

/**
 * Thrown when entry data is invalid
 */
export class InvalidEntryError extends StorageError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntryError';
  }
}

/**
 * Thrown when database operations fail
 */
export class DatabaseError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DatabaseError';
  }
}
