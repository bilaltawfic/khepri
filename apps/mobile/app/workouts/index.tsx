import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import {
  DIFFICULTY_LEVELS,
  type DifficultyLevel,
  WORKOUT_CATEGORIES,
  type WorkoutCategory,
  type WorkoutTemplate,
} from '@khepri/core';

import { EmptyState } from '@/components/EmptyState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useWorkoutTemplates } from '@/hooks';

type TemplateSource = 'all' | 'gym' | 'travel';

const SOURCE_OPTIONS: readonly TemplateSource[] = ['all', 'gym', 'travel'];

function getCategoryLabel(cat: WorkoutCategory): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getDifficultyLabel(diff: DifficultyLevel): string {
  return diff.charAt(0).toUpperCase() + diff.slice(1);
}

function getCategoryColor(cat: WorkoutCategory, colorScheme: 'light' | 'dark'): string {
  switch (cat) {
    case 'strength':
      return Colors[colorScheme].error;
    case 'mobility':
      return Colors[colorScheme].info;
    case 'core':
      return Colors[colorScheme].warning;
    case 'plyometric':
      return Colors[colorScheme].success;
  }
}

function FilterChip({
  label,
  isActive,
  onPress,
  colorScheme,
}: Readonly<{
  label: string;
  isActive: boolean;
  onPress: () => void;
  colorScheme: 'light' | 'dark';
}>) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={[
        styles.chip,
        {
          backgroundColor: isActive
            ? Colors[colorScheme].primary
            : Colors[colorScheme].surfaceVariant,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.chipText,
          { color: isActive ? Colors[colorScheme].textInverse : Colors[colorScheme].text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function TemplateCard({
  template,
  colorScheme,
}: Readonly<{
  template: WorkoutTemplate;
  colorScheme: 'light' | 'dark';
}>) {
  return (
    <Pressable
      onPress={() => router.push(`/workouts/${template.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${template.name}, ${getCategoryLabel(template.category)}, ${getDifficultyLabel(template.difficulty)}, ${template.estimatedDurationMinutes} minutes, ${template.exercises.length} exercises`}
    >
      <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {template.name}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={2} style={styles.description}>
          {template.description}
        </ThemedText>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: getCategoryColor(template.category, colorScheme) },
            ]}
          >
            <ThemedText style={styles.badgeText}>{getCategoryLabel(template.category)}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
            <ThemedText style={styles.badgeTextDark}>
              {getDifficultyLabel(template.difficulty)}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={Colors[colorScheme].icon} />
            <ThemedText type="caption">{`${template.estimatedDurationMinutes}min`}</ThemedText>
          </View>
        </View>
        <ThemedText type="caption" style={styles.exerciseCount}>
          {`${template.exercises.length} exercises`}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function WorkoutListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { templates, source, setSource, category, setCategory, difficulty, setDifficulty } =
    useWorkoutTemplates();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: Colors[colorScheme].background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Source filter */}
      <View style={styles.filterSection}>
        <ThemedText type="caption" style={styles.filterLabel}>
          Source
        </ThemedText>
        <View style={styles.chipRow}>
          {SOURCE_OPTIONS.map((s) => (
            <FilterChip
              key={s}
              label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              isActive={source === s}
              onPress={() => setSource(s)}
              colorScheme={colorScheme}
            />
          ))}
        </View>
      </View>

      {/* Category filter */}
      <View style={styles.filterSection}>
        <ThemedText type="caption" style={styles.filterLabel}>
          Category
        </ThemedText>
        <View style={styles.chipRow}>
          <FilterChip
            label="All"
            isActive={category == null}
            onPress={() => setCategory(null)}
            colorScheme={colorScheme}
          />
          {WORKOUT_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={getCategoryLabel(c)}
              isActive={category === c}
              onPress={() => setCategory(c)}
              colorScheme={colorScheme}
            />
          ))}
        </View>
      </View>

      {/* Difficulty filter */}
      <View style={styles.filterSection}>
        <ThemedText type="caption" style={styles.filterLabel}>
          Difficulty
        </ThemedText>
        <View style={styles.chipRow}>
          <FilterChip
            label="All"
            isActive={difficulty == null}
            onPress={() => setDifficulty(null)}
            colorScheme={colorScheme}
          />
          {DIFFICULTY_LEVELS.map((d) => (
            <FilterChip
              key={d}
              label={getDifficultyLabel(d)}
              isActive={difficulty === d}
              onPress={() => setDifficulty(d)}
              colorScheme={colorScheme}
            />
          ))}
        </View>
      </View>

      {/* Template list */}
      {templates.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="No Workouts Found"
          message="Try adjusting your filters to see more workouts."
        />
      ) : (
        templates.map((t) => <TemplateCard key={t.id} template={t} colorScheme={colorScheme} />)
      )}
    </ScrollView>
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
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  description: {
    marginTop: 4,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  badgeTextDark: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  exerciseCount: {
    marginTop: 8,
  },
});
