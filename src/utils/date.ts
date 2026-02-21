/**
 * Convert Date to Unix timestamp in seconds
 */
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
