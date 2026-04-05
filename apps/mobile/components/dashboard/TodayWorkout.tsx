import { StyleSheet, View, useColorScheme } from 'react-native';

import type { WorkoutRow } from '@khepri/supabase-client';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ComplianceDot } from '@/components/compliance/ComplianceDot';
import { Colors } from '@/constants/Colors';

interface WorkoutSection {
  readonly name: string;
  readonly steps: readonly WorkoutStep[];
  readonly durationMinutes: number;
}

interface WorkoutStep {
  readonly description: string;
  readonly durationMinutes?: number;
  readonly repeat?: number;
}

interface WorkoutStructure {
  readonly sections: readonly WorkoutSection[];
  readonly totalDurationMinutes: number;
  readonly notes?: string;
}

interface TodayWorkoutProps {
  readonly workouts: readonly WorkoutRow[];
  readonly isRestDay: boolean;
}

const SPORT_EMOJI: Record<string, string> = {
  swim: '\u{1F3CA}',
  bike: '\u{1F6B4}',
  run: '\u{1F3C3}',
  strength: '\u{1F4AA}',
  rest: '\u{1F4A4}',
};

const SYNC_LABELS: Record<
  string,
  { readonly text: string; readonly color: 'success' | 'warning' | 'info' }
> = {
  synced: { text: 'Synced to Intervals.icu', color: 'success' },
  pending: { text: 'Sync pending', color: 'warning' },
  not_connected: { text: 'Not connected', color: 'info' },
  conflict: { text: 'Sync conflict', color: 'warning' },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function parseStructure(json: unknown): WorkoutStructure | null {
  if (json == null || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.sections)) return null;
  return json as WorkoutStructure;
}

function WorkoutSectionView({ section }: Readonly<{ section: WorkoutSection }>) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionName}>
        {section.name}
        {section.steps.some((s) => s.repeat != null && s.repeat > 1)
          ? ` ${section.steps.find((s) => s.repeat != null && s.repeat > 1)?.repeat}x`
          : ''}
      </ThemedText>
      {section.steps.map((step, i) => (
        <ThemedText key={`${section.name}-${i}`} type="caption" style={styles.stepText}>
          {step.durationMinutes == null ? '' : `${step.durationMinutes}m `}
          {step.description}
        </ThemedText>
      ))}
    </View>
  );
}

function SingleWorkoutCard({ workout }: Readonly<{ workout: WorkoutRow }>) {
  const colorScheme = useColorScheme() ?? 'light';
  const structure = parseStructure(workout.structure);
  const sportEmoji = SPORT_EMOJI[workout.sport] ?? '';
  const syncInfo = SYNC_LABELS[workout.sync_status] ?? SYNC_LABELS.not_connected;
  const compliance = workout.compliance as {
    readonly score: 'green' | 'amber' | 'red' | 'missed' | 'unplanned';
  } | null;

  return (
    <View style={styles.workoutEntry}>
      <View style={styles.workoutHeader}>
        <ThemedText type="defaultSemiBold">
          {sportEmoji} {workout.name} ({formatDuration(workout.planned_duration_minutes)})
        </ThemedText>
        {compliance != null && <ComplianceDot score={compliance.score} size={12} />}
      </View>

      <View style={styles.syncBadge}>
        <View style={[styles.syncDot, { backgroundColor: Colors[colorScheme][syncInfo.color] }]} />
        <ThemedText type="caption">{syncInfo.text}</ThemedText>
      </View>

      {structure != null && structure.sections.length > 0 && (
        <View style={styles.structureContainer}>
          {structure.sections.map((s, i) => (
            <WorkoutSectionView key={`${s.name}-${i}`} section={s} />
          ))}
        </View>
      )}

      {workout.completed_at != null && workout.actual_duration_minutes != null && (
        <ThemedText type="caption" style={styles.actualMeta}>
          Completed: {formatDuration(workout.actual_duration_minutes)} actual
          {workout.actual_tss == null ? '' : ` / ${workout.actual_tss} TSS`}
        </ThemedText>
      )}
    </View>
  );
}

function TodayWorkoutContent({
  workouts,
  isRestDay,
}: Readonly<{ workouts: readonly WorkoutRow[]; isRestDay: boolean }>) {
  if (isRestDay && workouts.length === 0) {
    return <ThemedText style={styles.emptyText}>Rest Day — Recovery and adaptation</ThemedText>;
  }
  if (workouts.length === 0) {
    return <ThemedText style={styles.emptyText}>No workout planned for today</ThemedText>;
  }
  return (
    <>
      {workouts.map((w) => (
        <SingleWorkoutCard key={w.id} workout={w} />
      ))}
    </>
  );
}

export function TodayWorkout({ workouts, isRestDay }: TodayWorkoutProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemedView
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Today's workout: ${workouts.length === 0 ? (isRestDay ? 'rest day' : 'no workout') : `${workouts.length} workout${workouts.length > 1 ? 's' : ''}`}`}
    >
      <ThemedText type="caption" style={styles.dateLabel}>
        TODAY &middot; {formatTodayDate()}
      </ThemedText>

      <TodayWorkoutContent workouts={workouts} isRestDay={isRestDay} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateLabel: {
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  workoutEntry: {
    gap: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  structureContainer: {
    marginTop: 8,
    gap: 8,
  },
  section: {
    gap: 2,
  },
  sectionName: {
    fontSize: 14,
  },
  stepText: {
    paddingLeft: 12,
    opacity: 0.8,
  },
  actualMeta: {
    marginTop: 8,
    opacity: 0.7,
  },
  emptyText: {
    opacity: 0.7,
  },
});
