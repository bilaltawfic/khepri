import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import type { Exercise, WorkoutTemplate } from '@khepri/core';

import { ErrorState } from '@/components/ErrorState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useWorkoutTemplates } from '@/hooks';

function getCategoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getDifficultyLabel(diff: string): string {
  return diff.charAt(0).toUpperCase() + diff.slice(1);
}

function formatReps(reps: number | string): string {
  return typeof reps === 'number' ? String(reps) : reps;
}

function formatMuscle(muscle: string): string {
  return muscle
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function ExerciseCard({
  exercise,
  index,
  colorScheme,
}: Readonly<{
  exercise: Exercise;
  index: number;
  colorScheme: 'light' | 'dark';
}>) {
  return (
    <ThemedView
      style={[styles.exerciseCard, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Exercise ${index + 1}: ${exercise.name}, ${exercise.sets} sets of ${formatReps(exercise.reps)}`}
    >
      <View style={styles.exerciseHeader}>
        <View
          style={[styles.exerciseNumber, { backgroundColor: Colors[colorScheme].primaryLight }]}
        >
          <ThemedText
            style={[styles.exerciseNumberText, { color: Colors[colorScheme].textInverse }]}
          >
            {index + 1}
          </ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.exerciseName}>
          {exercise.name}
        </ThemedText>
      </View>

      <View style={styles.exerciseDetails}>
        <View style={styles.detailItem}>
          <ThemedText type="caption">Sets × Reps</ThemedText>
          <ThemedText type="defaultSemiBold">
            {`${exercise.sets} × ${formatReps(exercise.reps)}`}
          </ThemedText>
        </View>
        <View style={styles.detailItem}>
          <ThemedText type="caption">Rest</ThemedText>
          <ThemedText type="defaultSemiBold">{`${exercise.restSeconds}s`}</ThemedText>
        </View>
      </View>

      {exercise.notes != null && (
        <ThemedText type="caption" style={styles.notes}>
          {exercise.notes}
        </ThemedText>
      )}

      {exercise.targetMuscles.length > 0 && (
        <View style={styles.muscleRow}>
          {exercise.targetMuscles.map((m) => (
            <View
              key={m}
              style={[styles.muscleTag, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            >
              <ThemedText style={styles.muscleTagText}>{formatMuscle(m)}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

function TemplateHeader({
  template,
  colorScheme,
}: Readonly<{
  template: WorkoutTemplate;
  colorScheme: 'light' | 'dark';
}>) {
  return (
    <View style={styles.header}>
      <ThemedText type="title">{template.name}</ThemedText>
      <ThemedText type="caption" style={styles.headerDescription}>
        {template.description}
      </ThemedText>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="albums-outline" size={16} color={Colors[colorScheme].icon} />
          <ThemedText type="caption">{getCategoryLabel(template.category)}</ThemedText>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="speedometer-outline" size={16} color={Colors[colorScheme].icon} />
          <ThemedText type="caption">{getDifficultyLabel(template.difficulty)}</ThemedText>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={Colors[colorScheme].icon} />
          <ThemedText type="caption">{`${template.estimatedDurationMinutes}min`}</ThemedText>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="flash-outline" size={16} color={Colors[colorScheme].icon} />
          <ThemedText type="caption">{`${template.estimatedTss} TSS`}</ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const { getTemplateById } = useWorkoutTemplates();

  const template = id == null ? undefined : getTemplateById(id);

  if (template == null) {
    return (
      <ScreenContainer>
        <ErrorState title="Workout Not Found" message="This workout template could not be found." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <TemplateHeader template={template} colorScheme={colorScheme} />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {`Exercises (${template.exercises.length})`}
        </ThemedText>

        {template.exercises.map((exercise, idx) => (
          <ExerciseCard
            key={exercise.name}
            exercise={exercise}
            index={idx}
            colorScheme={colorScheme}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerDescription: {
    marginTop: 6,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseName: {
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  detailItem: {
    gap: 2,
  },
  notes: {
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
