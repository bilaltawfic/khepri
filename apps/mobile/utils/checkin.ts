import { Colors } from '@/constants/Colors';
import type { AIRecommendation } from '@/types/checkin';

/** Runtime validation for AIRecommendation from JSONB data. */
export function isValidRecommendation(value: unknown): value is AIRecommendation {
  if (value == null || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.summary === 'string' &&
    typeof rec.workoutSuggestion === 'string' &&
    typeof rec.intensityLevel === 'string' &&
    typeof rec.duration === 'number'
  );
}

/** Format a YYYY-MM-DD date string for display as "Today", "Yesterday", or a formatted date. */
export function formatCheckinDate(
  dateString: string,
  options?: { readonly long?: boolean }
): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  if (options?.long) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Map an intensity level to a training zone color. */
export function getIntensityColor(intensity: string, colorScheme: 'light' | 'dark'): string {
  switch (intensity) {
    case 'recovery':
      return Colors[colorScheme].zoneRecovery;
    case 'easy':
      return Colors[colorScheme].zoneEndurance;
    case 'moderate':
      return Colors[colorScheme].zoneTempo;
    case 'hard':
      return Colors[colorScheme].zoneThreshold;
    default:
      return Colors[colorScheme].textTertiary;
  }
}

/** Calculate a 0–100 wellness score from check-in metrics. */
export function getWellnessScore(metrics: {
  readonly sleepQuality: number | null;
  readonly energyLevel: number | null;
  readonly stressLevel: number | null;
  readonly overallSoreness: number | null;
}): number | null {
  const { sleepQuality, energyLevel, stressLevel, overallSoreness } = metrics;
  if (
    sleepQuality == null ||
    energyLevel == null ||
    stressLevel == null ||
    overallSoreness == null
  ) {
    return null;
  }
  const sleepScore = sleepQuality / 10;
  const energyScore = energyLevel / 10;
  const stressScore = 1 - stressLevel / 10;
  const sorenessScore = 1 - overallSoreness / 10;
  return Math.round(((sleepScore + energyScore + stressScore + sorenessScore) / 4) * 100);
}
