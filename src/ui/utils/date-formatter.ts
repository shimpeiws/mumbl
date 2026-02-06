import type { JournalEntry } from '../../repositories/types.js';

/**
 * Date group categories for organizing entries
 */
export type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'older';

/**
 * Grouped entries with label
 */
export interface GroupedEntries {
  group: DateGroup;
  label: string;
  entries: JournalEntry[];
}

/**
 * Get the start of a day (midnight)
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the start of the week (Sunday)
 */
function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

/**
 * Get the start of the month
 */
function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Determines which date group a date belongs to
 */
export function getDateGroup(date: Date, now: Date = new Date()): DateGroup {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisMonthStart = startOfMonth(now);

  const targetDay = startOfDay(date);

  if (targetDay.getTime() >= today.getTime()) {
    return 'today';
  }
  if (targetDay.getTime() >= yesterday.getTime()) {
    return 'yesterday';
  }
  if (targetDay.getTime() >= thisWeekStart.getTime()) {
    return 'thisWeek';
  }
  if (targetDay.getTime() >= lastWeekStart.getTime()) {
    return 'lastWeek';
  }
  if (targetDay.getTime() >= thisMonthStart.getTime()) {
    return 'thisMonth';
  }
  return 'older';
}

/**
 * Get display label for a date group
 */
export function getGroupLabel(group: DateGroup): string {
  const labels: Record<DateGroup, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    older: 'Older',
  };
  return labels[group];
}

/**
 * Groups entries by date category
 * Entries are expected to be sorted by timestamp descending
 */
export function groupEntriesByDate(
  entries: JournalEntry[],
  now: Date = new Date(),
): GroupedEntries[] {
  const groups: Map<DateGroup, JournalEntry[]> = new Map();

  for (const entry of entries) {
    const group = getDateGroup(entry.timestamp, now);
    const existing = groups.get(group) || [];
    existing.push(entry);
    groups.set(group, existing);
  }

  // Return groups in chronological order (oldest first for chat-style display)
  const groupOrder: DateGroup[] = [
    'older',
    'thisMonth',
    'lastWeek',
    'thisWeek',
    'yesterday',
    'today',
  ];

  return groupOrder
    .filter((group) => groups.has(group))
    .map((group) => ({
      group,
      label: getGroupLabel(group),
      entries: groups.get(group) || [],
    }));
}

/**
 * Formats a date as relative or absolute based on recency
 * - Today: "2:34 PM"
 * - Yesterday: "Yesterday at 2:34 PM"
 * - This week: "Monday at 2:34 PM"
 * - Older: "Jan 25 at 2:34 PM"
 */
export function formatEntryTimestamp(date: Date, now: Date = new Date()): string {
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const group = getDateGroup(date, now);

  switch (group) {
    case 'today':
      return timeStr;
    case 'yesterday':
      return `Yesterday at ${timeStr}`;
    case 'thisWeek':
    case 'lastWeek': {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      return `${dayName} at ${timeStr}`;
    }
    default: {
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `${dateStr} at ${timeStr}`;
    }
  }
}

/**
 * Formats a full date for detail view
 */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
