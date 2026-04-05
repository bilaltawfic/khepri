import { StyleSheet, View, useColorScheme } from 'react-native';

import { parseDateOnly } from '@khepri/core';
import type { WorkoutRow } from '@khepri/supabase-client';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

interface UpcomingProps {
  readonly workouts: readonly WorkoutRow[];
}

const SPORT_EMOJI: Record<string, string> = {
  swim: '\u{1F3CA}',
  bike: '\u{1F6B4}',
  run: '\u{1F3C3}',
  strength: '\u{1F4AA}',
  rest: '\u{1F4A4}',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function getDayLabel(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return DAY_LABELS[d.getDay()] ?? '';
}

// Group workouts by date, then render each date's workouts
function groupByDate(workouts: readonly WorkoutRow[]): Map<string, WorkoutRow[]> {
  const map = new Map<string, WorkoutRow[]>();
  for (const w of workouts) {
    const existing = map.get(w.date);
    if (existing != null) {
      existing.push(w);
    } else {
      map.set(w.date, [w]);
    }
  }
  return map;
}

function UpcomingRow({ workout }: Readonly<{ workout: WorkoutRow }>) {
  const sportEmoji = SPORT_EMOJI[workout.sport] ?? '';

  return (
    <View style={styles.row} accessibilityRole="text">
      <ThemedText style={styles.emoji}>{sportEmoji}</ThemedText>
      <ThemedText style={styles.name} numberOfLines={1}>
        {workout.name}
      </ThemedText>
      <ThemedText type="caption">{formatDuration(workout.planned_duration_minutes)}</ThemedText>
    </View>
  );
}

export function Upcoming({ workouts }: UpcomingProps) {
  const colorScheme = useColorScheme() ?? 'light';

  if (workouts.length === 0) return null;

  const grouped = groupByDate(workouts);
  // Get dates sorted
  const dates = [...grouped.keys()].sort();

  return (
    <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <ThemedText type="caption" style={styles.title}>
        UPCOMING
      </ThemedText>
      {dates.map((date) => {
        const dayWorkouts = grouped.get(date) ?? [];
        return (
          <View key={date}>
            <View style={styles.dateRow}>
              <ThemedText type="defaultSemiBold" style={styles.dayLabel}>
                {getDayLabel(date)}
              </ThemedText>
              <View style={styles.dayWorkouts}>
                {dayWorkouts.map((w) => (
                  <UpcomingRow key={w.id} workout={w} />
                ))}
              </View>
            </View>
          </View>
        );
      })}
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
  title: {
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  dayLabel: {
    width: 36,
    fontSize: 14,
  },
  dayWorkouts: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    width: 24,
    textAlign: 'center',
  },
  name: {
    flex: 1,
  },
});
