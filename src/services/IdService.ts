import { randomUUID } from 'node:crypto';

/**
 * Generate a unique UUID v4 for entry ID
 */
export function generateEntryId(): string {
  return randomUUID();
}

/**
 * Validate UUID v4 format
 */
export function isValidEntryId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}
