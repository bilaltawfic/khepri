/**
 * Shared formatting utilities for dates, times, and durations.
 */

/**
 * Format a date for display (e.g., "Jun 15, 2024")
 */
export function formatDate(date?: Date): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date range (e.g., "Jun 15, 2024 - Jul 15, 2024" or "Jun 15, 2024 - Ongoing")
 */
export function formatDateRange(startDate: Date, endDate?: Date): string {
  if (endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  return `${formatDate(startDate)} - Ongoing`;
}

/**
 * Format seconds as duration (e.g., 3661 -> "1:01:01" or 125 -> "2:05")
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
