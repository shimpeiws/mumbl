import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../../repositories/types.js';
import {
  formatEntryTimestamp,
  formatFullDate,
  getDateGroup,
  getGroupLabel,
  groupEntriesByDate,
} from './date-formatter.js';

function createEntry(timestamp: Date, id = 'test-id'): JournalEntry {
  return {
    id,
    timestamp,
    content: 'Test content',
    metadata: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('getDateGroup', () => {
  const now = new Date('2026-02-02T12:00:00');

  it('should return "today" for dates from today', () => {
    const today = new Date('2026-02-02T08:00:00');
    expect(getDateGroup(today, now)).toBe('today');
  });

  it('should return "yesterday" for dates from yesterday', () => {
    const yesterday = new Date('2026-02-01T15:00:00');
    expect(getDateGroup(yesterday, now)).toBe('yesterday');
  });

  it('should return "thisWeek" for dates earlier this week', () => {
    // Feb 2, 2026 is a Monday, so Sunday Feb 1 is start of this week
    const thisWeek = new Date('2026-02-01T08:00:00'); // Sunday (start of week)
    // Note: Feb 1 at 8am is yesterday from Feb 2 at 12pm, so it should be "yesterday"
    expect(getDateGroup(thisWeek, now)).toBe('yesterday');
  });

  it('should return "lastWeek" for dates from last week', () => {
    // Last week would be Jan 25-31, 2026
    const lastWeek = new Date('2026-01-27T12:00:00');
    expect(getDateGroup(lastWeek, now)).toBe('lastWeek');
  });

  it('should return "thisMonth" for dates earlier this month', () => {
    const thisMonth = new Date('2026-02-01T00:00:00');
    expect(getDateGroup(thisMonth, now)).toBe('yesterday'); // Feb 1 is yesterday from Feb 2
  });

  it('should return "older" for dates before this month', () => {
    const older = new Date('2025-12-15T12:00:00');
    expect(getDateGroup(older, now)).toBe('older');
  });
});

describe('getGroupLabel', () => {
  it('should return correct labels for each group', () => {
    expect(getGroupLabel('today')).toBe('Today');
    expect(getGroupLabel('yesterday')).toBe('Yesterday');
    expect(getGroupLabel('thisWeek')).toBe('This Week');
    expect(getGroupLabel('lastWeek')).toBe('Last Week');
    expect(getGroupLabel('thisMonth')).toBe('This Month');
    expect(getGroupLabel('older')).toBe('Older');
  });
});

describe('groupEntriesByDate', () => {
  const now = new Date('2026-02-02T12:00:00');

  it('should return empty array for empty entries', () => {
    expect(groupEntriesByDate([], now)).toEqual([]);
  });

  it('should group entries by date category', () => {
    const entries = [
      createEntry(new Date('2026-02-02T10:00:00'), '1'),
      createEntry(new Date('2026-02-02T08:00:00'), '2'),
      createEntry(new Date('2026-02-01T15:00:00'), '3'),
      createEntry(new Date('2025-12-15T12:00:00'), '4'),
    ];

    const grouped = groupEntriesByDate(entries, now);

    expect(grouped).toHaveLength(3);
    // Groups are ordered oldest first for chat-style display
    expect(grouped[0].group).toBe('older');
    expect(grouped[0].entries).toHaveLength(1);
    expect(grouped[1].group).toBe('yesterday');
    expect(grouped[1].entries).toHaveLength(1);
    expect(grouped[2].group).toBe('today');
    expect(grouped[2].entries).toHaveLength(2);
  });

  it('should maintain entry order within groups', () => {
    const entries = [
      createEntry(new Date('2026-02-02T10:00:00'), '1'),
      createEntry(new Date('2026-02-02T08:00:00'), '2'),
    ];

    const grouped = groupEntriesByDate(entries, now);
    expect(grouped[0].entries[0].id).toBe('1');
    expect(grouped[0].entries[1].id).toBe('2');
  });
});

describe('formatEntryTimestamp', () => {
  const now = new Date('2026-02-02T12:00:00');

  it('should format today timestamps as time only', () => {
    const today = new Date('2026-02-02T14:30:00');
    const result = formatEntryTimestamp(today, now);
    expect(result).toMatch(/2:30\s*PM/i);
  });

  it('should format yesterday timestamps with "Yesterday"', () => {
    const yesterday = new Date('2026-02-01T14:30:00');
    const result = formatEntryTimestamp(yesterday, now);
    expect(result).toMatch(/Yesterday at 2:30\s*PM/i);
  });

  it('should format this week timestamps with day name', () => {
    const thisWeek = new Date('2026-01-28T14:30:00');
    const result = formatEntryTimestamp(thisWeek, now);
    expect(result).toMatch(/Wednesday at 2:30\s*PM/i);
  });

  it('should format older timestamps with month and day', () => {
    const older = new Date('2025-12-15T14:30:00');
    const result = formatEntryTimestamp(older, now);
    expect(result).toMatch(/Dec 15 at 2:30\s*PM/i);
  });
});

describe('formatFullDate', () => {
  it('should format date with full details', () => {
    const date = new Date('2026-02-02T14:30:00');
    const result = formatFullDate(date);
    expect(result).toContain('Monday');
    expect(result).toContain('February');
    expect(result).toContain('2');
    expect(result).toContain('2026');
  });
});
