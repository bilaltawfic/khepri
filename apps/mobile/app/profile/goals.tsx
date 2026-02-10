import { Ionicons } from '@expo/vector-icons';
import type { GoalRow } from '@khepri/supabase-client';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useGoals } from '@/hooks';
import { formatDate, formatDuration } from '@/utils/formatters';

export type GoalType = 'race' | 'performance' | 'fitness' | 'health';
export type GoalPriority = 'A' | 'B' | 'C';
export type GoalStatus = 'active' | 'completed' | 'cancelled';

export type Goal = {
  id: string;
  goalType: GoalType;
  title: string;
  description?: string;
  targetDate?: Date;
  priority: GoalPriority;
  status: GoalStatus;
  // Race-specific
  raceEventName?: string;
  raceDistance?: string;
  raceLocation?: string;
  raceTargetTimeSeconds?: number;
  // Performance-specific
  perfMetric?: string;
  perfCurrentValue?: number;
  perfTargetValue?: number;
  // Fitness-specific
  fitnessMetric?: string;
  fitnessTargetValue?: number;
  // Health-specific
  healthMetric?: string;
  healthCurrentValue?: number;
  healthTargetValue?: number;
};

const validGoalTypes = ['race', 'performance', 'fitness', 'health'] as const;
const validGoalStatuses = ['active', 'completed', 'cancelled'] as const;
const validGoalPriorities = ['A', 'B', 'C'] as const;

export function isValidGoalType(value: unknown): value is GoalType {
  return typeof value === 'string' && validGoalTypes.includes(value as GoalType);
}

export function isValidGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === 'string' && validGoalStatuses.includes(value as GoalStatus);
}

export function isValidGoalPriority(value: unknown): value is GoalPriority {
  return typeof value === 'string' && validGoalPriorities.includes(value as GoalPriority);
}

/**
 * Parses a date-only string (YYYY-MM-DD) as a local date.
 * Using new Date(dateString) directly would parse as UTC and can shift the day in some timezones.
 */
export function parseDateOnly(dateString: string): Date {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    return new Date(dateString); // Fallback
  }
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(dateString); // Fallback
  }
  return new Date(year, month - 1, day);
}

/**
 * Maps a GoalRow from the database to the UI Goal type.
 * Includes runtime validation for enum values.
 */
export function mapGoalRowToGoal(row: GoalRow): Goal {
  const goalType = isValidGoalType(row.goal_type) ? row.goal_type : 'fitness';
  const status = isValidGoalStatus(row.status) ? row.status : 'active';
  // Priority is nullable in DB; default to 'B' (medium) when null/invalid
  // so all goals display with a priority badge in the UI
  const priority = isValidGoalPriority(row.priority) ? row.priority : 'B';

  return {
    id: row.id,
    goalType,
    title: row.title,
    description: row.description ?? undefined,
    targetDate: row.target_date ? parseDateOnly(row.target_date) : undefined,
    priority,
    status,
    // Race-specific
    raceEventName: row.race_event_name ?? undefined,
    raceDistance: row.race_distance ?? undefined,
    raceLocation: row.race_location ?? undefined,
    raceTargetTimeSeconds: row.race_target_time_seconds ?? undefined,
    // Performance-specific
    perfMetric: row.perf_metric ?? undefined,
    perfCurrentValue: row.perf_current_value ?? undefined,
    perfTargetValue: row.perf_target_value ?? undefined,
    // Fitness-specific
    fitnessMetric: row.fitness_metric ?? undefined,
    fitnessTargetValue: row.fitness_target_value ?? undefined,
    // Health-specific
    healthMetric: row.health_metric ?? undefined,
    healthCurrentValue: row.health_current_value ?? undefined,
    healthTargetValue: row.health_target_value ?? undefined,
  };
}

const goalTypeConfig: Record<
  GoalType,
  { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }
> = {
  race: { icon: 'trophy', label: 'Race' },
  performance: { icon: 'trending-up', label: 'Performance' },
  fitness: { icon: 'fitness', label: 'Fitness' },
  health: { icon: 'heart', label: 'Health' },
};

const priorityConfig: Record<GoalPriority, { color: string; label: string }> = {
  A: { color: '#c62828', label: 'A - Primary' },
  B: { color: '#f9a825', label: 'B - Secondary' },
  C: { color: '#2e7d32', label: 'C - Maintenance' },
};

function getRaceSubtitle(goal: Goal): string {
  const parts: string[] = [];
  if (goal.raceDistance) parts.push(goal.raceDistance);
  if (goal.raceLocation) parts.push(goal.raceLocation);
  if (goal.raceTargetTimeSeconds != null) {
    parts.push(`Target: ${formatDuration(goal.raceTargetTimeSeconds)}`);
  }
  return parts.join(' | ') || 'Race goal';
}

function getPerformanceSubtitle(goal: Goal): string {
  if (goal.perfCurrentValue != null && goal.perfTargetValue != null && goal.perfMetric) {
    return `${goal.perfMetric}: ${goal.perfCurrentValue} -> ${goal.perfTargetValue}`;
  }
  return goal.perfMetric || 'Performance goal';
}

function getFitnessSubtitle(goal: Goal): string {
  if (goal.fitnessTargetValue != null && goal.fitnessMetric) {
    return `Target: ${goal.fitnessTargetValue} ${goal.fitnessMetric}`;
  }
  return goal.fitnessMetric || 'Fitness goal';
}

function getHealthSubtitle(goal: Goal): string {
  if (goal.healthCurrentValue != null && goal.healthTargetValue != null && goal.healthMetric) {
    return `${goal.healthMetric}: ${goal.healthCurrentValue} -> ${goal.healthTargetValue}`;
  }
  return goal.healthMetric || 'Health goal';
}

// Exported for testing
export function getGoalSubtitle(goal: Goal): string {
  switch (goal.goalType) {
    case 'race':
      return getRaceSubtitle(goal);
    case 'performance':
      return getPerformanceSubtitle(goal);
    case 'fitness':
      return getFitnessSubtitle(goal);
    case 'health':
      return getHealthSubtitle(goal);
    default:
      return '';
  }
}

export type GoalCardProps = {
  goal: Goal;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

// Exported for testing
export function GoalCard({ goal, colorScheme, onPress }: Readonly<GoalCardProps>) {
  const config = goalTypeConfig[goal.goalType];
  const priority = priorityConfig[goal.priority];

  return (
    <Pressable
      style={[styles.goalCard, { backgroundColor: Colors[colorScheme].surface }]}
      onPress={onPress}
      accessibilityLabel={`${goal.title}, ${config.label} goal, priority ${goal.priority}`}
      accessibilityRole="button"
    >
      <View style={[styles.goalIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name={config.icon} size={24} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.goalContent}>
        <View style={styles.goalHeader}>
          <ThemedText type="defaultSemiBold" style={styles.goalTitle} numberOfLines={1}>
            {goal.title}
          </ThemedText>
          <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
            <ThemedText style={styles.priorityText}>{goal.priority}</ThemedText>
          </View>
        </View>
        <ThemedText type="caption" numberOfLines={1}>
          {getGoalSubtitle(goal)}
        </ThemedText>
        {goal.targetDate && (
          <ThemedText type="caption" style={{ color: Colors[colorScheme].primary }}>
            {formatDate(goal.targetDate)}
          </ThemedText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors[colorScheme].iconSecondary} />
    </Pressable>
  );
}

type AddGoalCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

function AddGoalCard({
  icon,
  title,
  description,
  colorScheme,
  onPress,
}: Readonly<AddGoalCardProps>) {
  return (
    <Pressable
      style={[styles.addGoalCard, { backgroundColor: Colors[colorScheme].surface }]}
      onPress={onPress}
      accessibilityLabel={`Add ${title.toLowerCase()}`}
      accessibilityRole="button"
    >
      <View style={[styles.addGoalIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name={icon} size={24} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.addGoalContent}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText type="caption">{description}</ThemedText>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={Colors[colorScheme].primary} />
    </Pressable>
  );
}

export default function GoalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { goals: goalRows, isLoading, error, refetch } = useGoals();

  // Map database rows to UI types
  const goals = goalRows.map(mapGoalRowToGoal);
  const activeGoals = goals.filter((g: Goal) => g.status === 'active');
  const completedGoals = goals.filter((g: Goal) => g.status === 'completed');

  const navigateToForm = (goalType: GoalType) => {
    router.push(`/profile/goal-form?type=${goalType}`);
  };

  const navigateToEdit = (goalId: string) => {
    router.push(`/profile/goal-form?id=${goalId}`);
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
          <ThemedText style={styles.loadingText}>Loading goals...</ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
            Failed to load goals
          </ThemedText>
          <ThemedText type="caption" style={styles.errorText}>
            {error}
          </ThemedText>
          <Button title="Retry" onPress={refetch} accessibilityLabel="Retry loading goals" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Active Goals Section */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="caption" style={styles.sectionTitle}>
              ACTIVE GOALS ({activeGoals.length})
            </ThemedText>
            <View style={styles.goalsList}>
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  colorScheme={colorScheme}
                  onPress={() => navigateToEdit(goal.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Add Goal Section */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            ADD A GOAL
          </ThemedText>
          <View style={styles.goalsList}>
            <AddGoalCard
              icon="trophy"
              title="Race Goal"
              description="A specific event you're training for"
              colorScheme={colorScheme}
              onPress={() => navigateToForm('race')}
            />
            <AddGoalCard
              icon="trending-up"
              title="Performance Goal"
              description="A fitness metric you want to improve"
              colorScheme={colorScheme}
              onPress={() => navigateToForm('performance')}
            />
            <AddGoalCard
              icon="fitness"
              title="Fitness Goal"
              description="Volume or consistency targets"
              colorScheme={colorScheme}
              onPress={() => navigateToForm('fitness')}
            />
            <AddGoalCard
              icon="heart"
              title="Health Goal"
              description="Weight, wellness, or lifestyle targets"
              colorScheme={colorScheme}
              onPress={() => navigateToForm('health')}
            />
          </View>
        </View>

        {/* Empty State */}
        {activeGoals.length === 0 && (
          <ThemedView
            style={[styles.emptyState, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <Ionicons name="flag-outline" size={40} color={Colors[colorScheme].iconSecondary} />
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              No active goals yet
            </ThemedText>
            <ThemedText type="caption" style={styles.emptyText}>
              Add a goal to help Khepri personalize your training. Start with your most important
              race or target.
            </ThemedText>
          </ThemedView>
        )}

        {/* Completed Goals Section */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="caption" style={styles.sectionTitle}>
              COMPLETED ({completedGoals.length})
            </ThemedText>
            <View style={styles.goalsList}>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  colorScheme={colorScheme}
                  onPress={() => navigateToEdit(goal.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Tip */}
        <ThemedView style={[styles.tipCard, { borderColor: Colors[colorScheme].primary }]}>
          <Ionicons name="bulb-outline" size={20} color={Colors[colorScheme].primary} />
          <ThemedText type="caption" style={styles.tipText}>
            Set priorities (A/B/C) to help Khepri understand which goals matter most. "A" goals get
            the primary focus in your training plan.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    marginTop: 4,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    paddingLeft: 4,
    fontWeight: '600',
  },
  goalsList: {
    gap: 8,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalContent: {
    flex: 1,
    gap: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  addGoalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addGoalContent: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emptyTitle: {
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 8,
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
  },
});
