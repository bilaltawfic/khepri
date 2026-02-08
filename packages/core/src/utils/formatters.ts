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
  if (seconds == null || seconds < 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
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
