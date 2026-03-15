import { describe, expect, it } from 'vitest';
import {
  DatabaseError,
  EntryNotFoundError,
  InvalidEntryError,
  StorageError,
} from './DomainErrors.js';

describe('StorageError', () => {
  it('should create error with message', () => {
    const error = new StorageError('test');
    expect(error.message).toBe('test');
    expect(error.name).toBe('StorageError');
  });

  it('should create error with cause', () => {
    const cause = new Error('original');
    const error = new StorageError('test', cause);
    expect(error.cause).toBe(cause);
  });
});

describe('EntryNotFoundError', () => {
  it('should include id in message', () => {
    const error = new EntryNotFoundError('abc-123');
    expect(error.message).toBe('Entry not found: abc-123');
    expect(error.name).toBe('EntryNotFoundError');
  });

  it('should be instance of StorageError', () => {
    expect(new EntryNotFoundError('id')).toBeInstanceOf(StorageError);
  });
});

describe('InvalidEntryError', () => {
  it('should use provided message', () => {
    const error = new InvalidEntryError('Content is empty');
    expect(error.message).toBe('Content is empty');
    expect(error.name).toBe('InvalidEntryError');
  });

  it('should be instance of StorageError', () => {
    expect(new InvalidEntryError('msg')).toBeInstanceOf(StorageError);
  });
});

describe('DatabaseError', () => {
  it('should create with message and cause', () => {
    const cause = new Error('SQLITE_ERROR');
    const error = new DatabaseError('Failed', cause);
    expect(error.message).toBe('Failed');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('DatabaseError');
  });

  it('should be instance of StorageError', () => {
    expect(new DatabaseError('err')).toBeInstanceOf(StorageError);
  });
});
