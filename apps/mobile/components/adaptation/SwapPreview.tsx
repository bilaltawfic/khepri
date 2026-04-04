import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export interface SwapWorkoutInfo {
  readonly name: string;
  readonly sport: string;
  readonly durationMinutes: number;
  readonly date: string;
}

export interface SwapPreviewProps {
  readonly workoutA: SwapWorkoutInfo; // Today's workout (will move to B's date)
  readonly workoutB: SwapWorkoutInfo; // Target day's workout (will move to A's date)
}

function WorkoutSlot({
  label,
  date,
  before,
  after,
  colors,
}: Readonly<{
  label: string;
  date: string;
  before: SwapWorkoutInfo;
  after: SwapWorkoutInfo;
  colors: typeof Colors.light;
}>) {
  const formattedDate = formatDate(date);

  return (
    <View style={[styles.slot, { backgroundColor: colors.surfaceVariant }]}>
      <ThemedText type="caption" style={[styles.slotLabel, { color: colors.textTertiary }]}>
        {label} — {formattedDate}
      </ThemedText>

      {/* Before */}
      <View style={styles.row}>
        <ThemedText type="caption" style={[styles.changeLabel, { color: colors.textTertiary }]}>
          Before
        </ThemedText>
        <View style={styles.workoutPill}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.strikethrough}>
            {before.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {before.sport} · {before.durationMinutes} min
          </ThemedText>
        </View>
      </View>

      <View style={styles.arrowRow}>
        <Ionicons name="arrow-down" size={14} color={colors.icon} />
      </View>

      {/* After */}
      <View style={styles.row}>
        <ThemedText type="caption" style={[styles.changeLabel, { color: colors.textTertiary }]}>
          After
        </ThemedText>
        <View style={styles.workoutPill}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {after.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {after.sport} · {after.durationMinutes} min
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function SwapPreview({ workoutA, workoutB }: SwapPreviewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // After swap: A's date gets B's content; B's date gets A's content
  return (
    <View style={styles.container}>
      <WorkoutSlot
        label="Today"
        date={workoutA.date}
        before={workoutA}
        after={workoutB}
        colors={colors}
      />

      <View style={styles.swapIcon}>
        <Ionicons name="swap-vertical" size={20} color={colors.primary} />
      </View>

      <WorkoutSlot
        label="Target day"
        date={workoutB.date}
        before={workoutB}
        after={workoutA}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  slot: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  slotLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  changeLabel: {
    width: 40,
    fontSize: 11,
    paddingTop: 2,
  },
  workoutPill: {
    flex: 1,
    gap: 2,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  arrowRow: {
    alignItems: 'center',
  },
  swapIcon: {
    alignSelf: 'center',
    padding: 4,
  },
});
