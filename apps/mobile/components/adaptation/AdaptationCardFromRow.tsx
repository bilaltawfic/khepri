import { getAdaptationWorkoutPair } from '@/utils/plan-helpers';

import { AdaptationCard } from './AdaptationCard';
import type { AdaptationType } from './AdaptationCard';

const VALID_ADAPTATION_TYPES = new Set<string>([
  'no_change',
  'reduce_intensity',
  'reduce_duration',
  'increase_intensity',
  'swap_days',
  'swap_not_viable',
  'add_rest',
  'substitute',
]);

function parseAdaptationType(value: unknown): AdaptationType {
  return typeof value === 'string' && VALID_ADAPTATION_TYPES.has(value)
    ? (value as AdaptationType)
    : 'reduce_intensity';
}

export interface AdaptationRowData {
  readonly id: string;
  readonly reason: string;
  readonly affected_workouts: unknown;
  readonly context: unknown;
}

export interface AdaptationCardFromRowProps {
  readonly adaptation: AdaptationRowData;
  readonly onAccept: (id: string) => void;
  readonly onReject: (id: string) => void;
  readonly isLoading?: boolean;
}

export function AdaptationCardFromRow({
  adaptation,
  onAccept,
  onReject,
  isLoading,
}: AdaptationCardFromRowProps) {
  const workoutPair = getAdaptationWorkoutPair(adaptation.affected_workouts);
  if (workoutPair == null) return null;

  const ctxData = adaptation.context as Record<string, unknown> | null;
  const adaptationType = parseAdaptationType(ctxData?.adaptationType);
  const swapDate = typeof ctxData?.swapTargetDate === 'string' ? ctxData.swapTargetDate : null;
  const swapTargetWorkout =
    adaptationType === 'swap_days' && swapDate != null
      ? {
          name: `Workout on ${swapDate}`,
          sport: workoutPair.original.sport,
          durationMinutes: workoutPair.original.durationMinutes,
          date: swapDate,
        }
      : null;

  return (
    <AdaptationCard
      adaptationId={adaptation.id}
      adaptationType={adaptationType}
      reason={adaptation.reason}
      originalWorkout={workoutPair.original}
      modifiedWorkout={workoutPair.modified}
      swapTargetWorkout={swapTargetWorkout}
      onAccept={onAccept}
      onReject={onReject}
      isLoading={isLoading}
    />
  );
}
