/**
 * Shared formatting utilities for dates, times, and durations.
 */

export function formatDate(date?: Date): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(startDate: Date, endDate?: Date): string {
  if (endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  return `${formatDate(startDate)} - Ongoing`;
}

export function formatDuration(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

export function getToday(): string {
  const now = new Date();
  const [date] = now.toISOString().split('T');
  return date ?? '';
}

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC).
 * This avoids timezone shifts that occur with `new Date(dateString)`.
 */
export function parseDateOnly(dateString: string): Date {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    return new Date(dateString);
  }
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(dateString);
  }
  return new Date(year, month - 1, day);
}

/**
 * Format a Date as YYYY-MM-DD in local timezone.
 * This avoids timezone shifts that occur with `toISOString().slice(0, 10)`.
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
