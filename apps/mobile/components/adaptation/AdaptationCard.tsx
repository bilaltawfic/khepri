import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export type AdaptationType =
  | 'no_change'
  | 'reduce_intensity'
  | 'reduce_duration'
  | 'increase_intensity'
  | 'swap_days'
  | 'add_rest'
  | 'substitute';

export interface AdaptationWorkoutSummary {
  readonly name: string;
  readonly sport: string;
  readonly durationMinutes: number;
  readonly date: string;
}

export interface AdaptationCardProps {
  readonly adaptationId: string;
  readonly adaptationType: AdaptationType;
  readonly reason: string;
  readonly originalWorkout: AdaptationWorkoutSummary;
  readonly modifiedWorkout?: AdaptationWorkoutSummary | null;
  readonly swapTargetWorkout?: AdaptationWorkoutSummary | null;
  readonly onAccept: (id: string) => void;
  readonly onReject: (id: string) => void;
  readonly isLoading?: boolean;
}

function getAdaptationLabel(type: AdaptationType): string {
  switch (type) {
    case 'no_change':
      return 'Keep as planned';
    case 'reduce_intensity':
      return 'Reduce intensity';
    case 'reduce_duration':
      return 'Shorten session';
    case 'increase_intensity':
      return 'Push harder today';
    case 'swap_days':
      return 'Swap workout days';
    case 'add_rest':
      return 'Take a rest day';
    case 'substitute':
      return 'Substitute workout';
  }
}

function getAdaptationIcon(type: AdaptationType): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'no_change':
      return 'checkmark-circle';
    case 'reduce_intensity':
      return 'trending-down';
    case 'reduce_duration':
      return 'time';
    case 'increase_intensity':
      return 'trending-up';
    case 'swap_days':
      return 'swap-horizontal';
    case 'add_rest':
      return 'bed';
    case 'substitute':
      return 'refresh';
  }
}

function WorkoutRow({
  label,
  workout,
  colors,
  strikethrough,
}: Readonly<{
  label: string;
  workout: AdaptationWorkoutSummary;
  colors: typeof Colors.light;
  strikethrough?: boolean;
}>) {
  return (
    <View style={styles.workoutRow}>
      <ThemedText type="caption" style={[styles.workoutLabel, { color: colors.textTertiary }]}>
        {label}
      </ThemedText>
      <View style={styles.workoutInfo}>
        <ThemedText
          type="defaultSemiBold"
          style={strikethrough === true ? styles.strikethrough : undefined}
        >
          {workout.name}
        </ThemedText>
        <ThemedText type="caption" style={{ color: colors.textSecondary }}>
          {workout.sport} · {workout.durationMinutes} min
        </ThemedText>
      </View>
    </View>
  );
}

export function AdaptationCard({
  adaptationId,
  adaptationType,
  reason,
  originalWorkout,
  modifiedWorkout,
  swapTargetWorkout,
  onAccept,
  onReject,
  isLoading = false,
}: AdaptationCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const icon = getAdaptationIcon(adaptationType);
  const label = getAdaptationLabel(adaptationType);
  const showBefore = adaptationType !== 'no_change';

  return (
    <ThemedView
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold">Coach Suggestion</ThemedText>
          <ThemedText type="caption" style={{ color: colors.textSecondary }}>
            {label}
          </ThemedText>
        </View>
      </View>

      {/* Reason */}
      <ThemedText style={[styles.reason, { color: colors.textSecondary }]}>{reason}</ThemedText>

      {/* Workout before/after */}
      {showBefore && (
        <View style={[styles.workoutSection, { backgroundColor: colors.surfaceVariant }]}>
          <WorkoutRow label="Today" workout={originalWorkout} colors={colors} strikethrough />
          {modifiedWorkout != null && (
            <>
              <View style={[styles.arrow, { borderTopColor: colors.border }]}>
                <Ionicons name="arrow-down" size={14} color={colors.icon} />
              </View>
              <WorkoutRow label="Suggested" workout={modifiedWorkout} colors={colors} />
            </>
          )}
          {swapTargetWorkout != null && adaptationType === 'swap_days' && (
            <>
              <View style={[styles.divider, { borderTopColor: colors.border }]} />
              <WorkoutRow
                label="Swap with"
                workout={swapTargetWorkout}
                colors={colors}
                strikethrough
              />
              <View style={[styles.arrow, { borderTopColor: colors.border }]}>
                <Ionicons name="swap-vertical" size={14} color={colors.icon} />
              </View>
              <WorkoutRow label="New plan" workout={originalWorkout} colors={colors} />
            </>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[
            styles.actionButton,
            styles.rejectButton,
            { borderColor: colors.border },
            isLoading && styles.disabled,
          ]}
          onPress={() => onReject(adaptationId)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Keep original workout"
          accessibilityState={{ disabled: isLoading }}
        >
          <ThemedText style={{ color: colors.textSecondary }}>Keep Original</ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.actionButton,
            styles.acceptButton,
            { backgroundColor: colors.primary },
            isLoading && styles.disabled,
          ]}
          onPress={() => onAccept(adaptationId)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Accept coach suggestion"
          accessibilityState={{ disabled: isLoading }}
        >
          <ThemedText style={{ color: colors.textInverse, fontWeight: '600' }}>
            {adaptationType === 'swap_days' ? 'Accept Swap' : 'Accept'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
  },
  workoutSection: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  workoutRow: {
    gap: 2,
  },
  workoutLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutInfo: {
    gap: 2,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  arrow: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  disabled: {
    opacity: 0.5,
  },
});
