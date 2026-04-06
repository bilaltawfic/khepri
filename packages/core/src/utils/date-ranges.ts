import type { UnavailableDate } from '../types/block.js';

// ====================================================================
// Types
// ====================================================================

export interface DateGroup {
  readonly startDate: string;
  readonly endDate: string;
  readonly reason?: string;
}

// ====================================================================
// Helpers
// ====================================================================

/** Format a UTC Date as YYYY-MM-DD. */
function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string as a UTC midnight Date. */
function parseUTC(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

/** Advance a YYYY-MM-DD string by one day. */
function nextDay(dateStr: string): string {
  const d = parseUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateStr(d);
}

// ====================================================================
// Expand a date range into individual UnavailableDate entries
// ====================================================================

/**
 * Expands a from/to date range into individual day entries sharing the
 * same reason. Handles month/year boundaries via UTC Date arithmetic.
 */
export function expandDateRange(from: string, to: string, reason?: string): UnavailableDate[] {
  const results: UnavailableDate[] = [];
  const startDate = parseUTC(from);
  const endDate = parseUTC(to);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = toDateStr(current);
    const entry: UnavailableDate =
      reason != null && reason.length > 0 ? { date: dateStr, reason } : { date: dateStr };
    results.push(entry);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
}

// ====================================================================
// Group consecutive dates with the same reason
// ====================================================================

/**
 * Groups consecutive UnavailableDate entries with the same reason into
 * DateGroup objects for compact display.
 */
export function groupUnavailableDates(dates: readonly UnavailableDate[]): DateGroup[] {
  if (dates.length === 0) return [];

  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  const groups: DateGroup[] = [];
  const first = sorted[0];
  if (first == null) return [];
  let currentStart = first.date;
  let currentEnd = first.date;
  let currentReason = first.reason;

  for (let i = 1; i < sorted.length; i++) {
    const entry = sorted[i];
    if (entry == null) continue;
    const nextExpected = nextDay(currentEnd);

    if (entry.date === nextExpected && entry.reason === currentReason) {
      currentEnd = entry.date;
    } else {
      groups.push(buildGroup(currentStart, currentEnd, currentReason));
      currentStart = entry.date;
      currentEnd = entry.date;
      currentReason = entry.reason;
    }
  }

  groups.push(buildGroup(currentStart, currentEnd, currentReason));
  return groups;
}

function buildGroup(startDate: string, endDate: string, reason?: string): DateGroup {
  const group: DateGroup = { startDate, endDate };
  if (reason != null && reason.length > 0) {
    return { ...group, reason };
  }
  return group;
}
