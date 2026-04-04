import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useBlockPlanning } from '@/hooks/useBlockPlanning';
import { formatWorkoutDuration, getSportIcon } from '@/utils/plan-helpers';
import type { WorkoutRow } from '@khepri/supabase-client';

// ====================================================================
// Helpers
// ====================================================================

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTotalHoursForWeek(weekWorkouts: readonly WorkoutRow[]): string {
  const totalMinutes = weekWorkouts.reduce((sum, w) => sum + w.planned_duration_minutes, 0);
  const hours = totalMinutes / 60;
  return hours.toFixed(1);
}

// ====================================================================
// Sub-components
// ====================================================================

function WorkoutCard({
  workout,
  colors,
}: Readonly<{ workout: WorkoutRow; colors: typeof Colors.light }>) {
  const [expanded, setExpanded] = useState(false);

  const structure = workout.structure as {
    sections?: readonly { name: string; steps: readonly { description: string }[] }[];
  } | null;

  return (
    <Pressable
      onPress={() => setExpanded((prev) => !prev)}
      style={[styles.workoutCard, { backgroundColor: colors.surface }]}
      accessibilityRole="button"
      accessibilityLabel={`${workout.name}, ${formatWorkoutDuration(workout.planned_duration_minutes)}. Tap to ${expanded ? 'collapse' : 'expand'} details.`}
    >
      <View style={styles.workoutHeader}>
        <Ionicons name={getSportIcon(workout.sport)} size={20} color={colors.primary} />
        <View style={styles.workoutInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {workout.name}
          </ThemedText>
          <ThemedText type="caption">
            {formatDate(workout.date)} · {formatWorkoutDuration(workout.planned_duration_minutes)}
          </ThemedText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.icon} />
      </View>

      {expanded && structure?.sections != null && structure.sections.length > 0 && (
        <View style={[styles.workoutDetail, { borderTopColor: colors.border }]}>
          {structure.sections.map((section, index) => (
            <View key={`${section.name}-${index}`} style={styles.sectionBlock}>
              <ThemedText type="caption" style={styles.sectionName}>
                {section.name}
              </ThemedText>
              {section.steps.map((step, stepIdx) => (
                <ThemedText
                  key={`step-${stepIdx}-${step.description.slice(0, 15)}`}
                  type="caption"
                  style={styles.stepText}
                >
                  {step.description}
                </ThemedText>
              ))}
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function WeekSection({
  weekNumber,
  weekWorkouts,
  colors,
}: Readonly<{
  weekNumber: number;
  weekWorkouts: readonly WorkoutRow[];
  colors: typeof Colors.light;
}>) {
  return (
    <View style={styles.weekSection}>
      <View style={styles.weekHeader}>
        <ThemedText type="defaultSemiBold">Week {weekNumber}</ThemedText>
        <ThemedText type="caption">{getTotalHoursForWeek(weekWorkouts)}h</ThemedText>
      </View>
      {weekWorkouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} colors={colors} />
      ))}
    </View>
  );
}

// ====================================================================
// Main Screen
// ====================================================================

export default function BlockReviewScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { block, workouts, error, isLoading } = useBlockPlanning();

  const handleLockIn = useCallback(() => {
    router.push('/plan/block-lock');
  }, []);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading workouts..." />
      </ThemedView>
    );
  }

  if (block == null || workouts.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={48} color={colors.icon} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            No workouts to review
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Go back to block setup to generate workouts.
          </ThemedText>
          <Button
            title="Back to Setup"
            variant="secondary"
            onPress={() => router.back()}
            accessibilityLabel="Go back to block setup"
          />
        </View>
      </ThemedView>
    );
  }

  // Group workouts by week
  const weekNumbers = [...new Set(workouts.map((w) => w.week_number))].sort((a, b) => a - b);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{block.name}</ThemedText>
          <ThemedText type="caption">
            {workouts.length} workouts across {weekNumbers.length} weeks
          </ThemedText>
        </View>

        {error != null && (
          <ThemedText
            type="caption"
            style={[styles.errorText, { color: colors.error }]}
            accessibilityRole="alert"
          >
            {error}
          </ThemedText>
        )}

        {weekNumbers.map((weekNum) => (
          <WeekSection
            key={weekNum}
            weekNumber={weekNum}
            weekWorkouts={workouts.filter((w) => w.week_number === weekNum)}
            colors={colors}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="Lock In This Plan"
          onPress={handleLockIn}
          accessibilityLabel="Proceed to lock in this training block"
        />
        <Button
          title="Back to Setup"
          variant="text"
          onPress={() => router.back()}
          accessibilityLabel="Go back to block setup"
        />
      </View>
    </ThemedView>
  );
}

// ====================================================================
// Styles
// ====================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  errorText: {
    marginBottom: 12,
  },
  weekSection: {
    marginBottom: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  workoutCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  workoutDetail: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  sectionBlock: {
    gap: 2,
  },
  sectionName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  stepText: {
    marginLeft: 12,
    opacity: 0.8,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 8,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
});
