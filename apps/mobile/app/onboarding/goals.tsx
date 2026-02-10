import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { TipCard } from '@/components/TipCard';
import { Colors } from '@/constants/Colors';
import { MAX_GOALS, type OnboardingGoal, useOnboarding } from '@/contexts';

// Parse ISO date string (YYYY-MM-DD) as local date to avoid timezone shift
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

type GoalType = OnboardingGoal['goalType'];

type GoalTypeConfig = {
  type: GoalType;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  example: string;
};

const GOAL_TYPES: GoalTypeConfig[] = [
  {
    type: 'race',
    icon: 'trophy',
    title: 'Race Goal',
    description: "A specific event you're training for",
    example: 'Complete Ironman 70.3 on June 15',
  },
  {
    type: 'performance',
    icon: 'trending-up',
    title: 'Performance Goal',
    description: 'A fitness metric you want to improve',
    example: 'Increase FTP from 250W to 280W',
  },
  {
    type: 'fitness',
    icon: 'fitness',
    title: 'Fitness Goal',
    description: 'Volume or consistency targets',
    example: 'Build to 40km running per week',
  },
  {
    type: 'health',
    icon: 'heart',
    title: 'Health Goal',
    description: 'Weight, wellness, or lifestyle targets',
    example: 'Lose 5kg before race season',
  },
];

type GoalTypeCardProps = Readonly<{
  config: GoalTypeConfig;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
  disabled?: boolean;
}>;

function GoalTypeCard({ config, colorScheme, onPress, disabled }: GoalTypeCardProps) {
  const { icon, title, description, example } = config;
  return (
    <Pressable
      style={[
        styles.goalCard,
        { backgroundColor: Colors[colorScheme].surface },
        disabled && styles.goalCardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`Add ${title.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={[styles.goalIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name={icon} size={28} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.goalContent}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText type="caption" style={styles.goalDescription}>
          {description}
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.goalExample, { color: Colors[colorScheme].primary }]}
        >
          Example: {example}
        </ThemedText>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={Colors[colorScheme].primary} />
    </Pressable>
  );
}

type AddedGoalCardProps = Readonly<{
  goal: OnboardingGoal;
  index: number;
  colorScheme: 'light' | 'dark';
  onRemove: (index: number) => void;
}>;

function AddedGoalCard({ goal, index, colorScheme, onRemove }: AddedGoalCardProps) {
  const config = GOAL_TYPES.find((g) => g.type === goal.goalType);
  if (!config) return null;

  return (
    <View style={[styles.addedGoalCard, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={[styles.goalIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name={config.icon} size={24} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.addedGoalContent}>
        <ThemedText type="defaultSemiBold" style={styles.addedGoalTitle}>
          {goal.title}
        </ThemedText>
        <View style={styles.addedGoalMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: Colors[colorScheme].primary }]}>
            <ThemedText style={[styles.priorityText, { color: Colors[colorScheme].textInverse }]}>
              {goal.priority}
            </ThemedText>
          </View>
          <ThemedText type="caption">{config.title}</ThemedText>
          {goal.targetDate && (
            <ThemedText type="caption" style={styles.goalDate}>
              {parseLocalDate(goal.targetDate).toLocaleDateString()}
            </ThemedText>
          )}
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(index)}
        accessibilityLabel={`Remove goal: ${goal.title}`}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={24} color={Colors[colorScheme].error} />
      </Pressable>
    </View>
  );
}

type AddGoalFormProps = Readonly<{
  goalType: GoalType;
  colorScheme: 'light' | 'dark';
  onSubmit: (goal: OnboardingGoal) => void;
  onCancel: () => void;
}>;

function AddGoalForm({ goalType, colorScheme, onSubmit, onCancel }: AddGoalFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'A' | 'B' | 'C'>('A');
  const [error, setError] = useState('');
  const config = GOAL_TYPES.find((g) => g.type === goalType);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a goal title');
      return;
    }
    onSubmit({
      goalType,
      title: trimmedTitle,
      priority,
    });
  };

  return (
    <View style={[styles.addGoalForm, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={styles.formHeader}>
        <ThemedText type="defaultSemiBold">Add {config?.title}</ThemedText>
        <Pressable
          onPress={onCancel}
          accessibilityLabel="Cancel adding goal"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
        </Pressable>
      </View>

      <ThemedText type="caption" style={styles.formLabel}>
        Goal Title
      </ThemedText>
      <TextInput
        style={[
          styles.formInput,
          {
            backgroundColor: Colors[colorScheme].surfaceVariant,
            color: Colors[colorScheme].text,
            borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
          },
        ]}
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (error) setError('');
        }}
        placeholder={config?.example}
        placeholderTextColor={Colors[colorScheme].textTertiary}
        accessibilityLabel="Goal title"
      />
      {error ? (
        <ThemedText
          type="caption"
          style={[styles.errorText, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      ) : null}

      <ThemedText type="caption" style={styles.formLabel}>
        Priority
      </ThemedText>
      <View style={styles.prioritySelector}>
        {(['A', 'B', 'C'] as const).map((p) => (
          <Pressable
            key={p}
            style={[
              styles.priorityOption,
              {
                backgroundColor:
                  priority === p ? Colors[colorScheme].primary : Colors[colorScheme].surfaceVariant,
              },
            ]}
            onPress={() => setPriority(p)}
            accessibilityLabel={`Priority ${p}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: priority === p }}
          >
            <ThemedText
              style={{
                color: priority === p ? Colors[colorScheme].textInverse : Colors[colorScheme].text,
                fontWeight: '600',
              }}
            >
              {p}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Button title="Add Goal" onPress={handleSubmit} accessibilityLabel="Add goal" />
    </View>
  );
}

export default function GoalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, addGoal, removeGoal } = useOnboarding();
  const [addingGoalType, setAddingGoalType] = useState<GoalType | null>(null);

  const handleContinue = () => {
    router.push('/onboarding/plan');
  };

  const handleAddGoal = (goal: OnboardingGoal) => {
    addGoal(goal);
    setAddingGoalType(null);
  };

  const isAtMaxGoals = data.goals.length >= MAX_GOALS;

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            What are you working toward?
          </ThemedText>
          <ThemedText style={styles.description}>
            Add your goals so Khepri can tailor your training. You can add up to {MAX_GOALS} goals,
            or skip and add them later.
          </ThemedText>
        </View>

        {/* Add goal form (shown when adding) */}
        {addingGoalType != null && (
          <AddGoalForm
            goalType={addingGoalType}
            colorScheme={colorScheme}
            onSubmit={handleAddGoal}
            onCancel={() => setAddingGoalType(null)}
          />
        )}

        {/* Goal type cards (hidden when adding) */}
        {addingGoalType == null && (
          <View style={styles.goalTypes}>
            {GOAL_TYPES.map((config) => (
              <GoalTypeCard
                key={config.type}
                config={config}
                colorScheme={colorScheme}
                onPress={() => setAddingGoalType(config.type)}
                disabled={isAtMaxGoals}
              />
            ))}
          </View>
        )}

        {/* Added goals */}
        {data.goals.length > 0 && addingGoalType == null && (
          <View style={styles.addedGoalsSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Your Goals ({data.goals.length}/{MAX_GOALS})
            </ThemedText>
            <View style={styles.addedGoalsList}>
              {data.goals.map((goal, index) => (
                <AddedGoalCard
                  key={`${goal.goalType}-${goal.title}-${index}`}
                  goal={goal}
                  index={index}
                  colorScheme={colorScheme}
                  onRemove={removeGoal}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state (only shown when no goals and not adding) */}
        {data.goals.length === 0 && addingGoalType == null && (
          <EmptyState
            icon="flag-outline"
            iconSize={32}
            message="No goals added yet. Tap a goal type above to get started."
            style={{ padding: 24, marginBottom: 16 }}
          />
        )}

        {/* Tip */}
        {addingGoalType == null && (
          <TipCard message="Tip: Start with your most important goal. Khepri will prioritize training to help you achieve it while keeping other goals in mind." />
        )}
      </ScrollView>

      {/* Action buttons (hidden when adding) */}
      {addingGoalType == null && (
        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={handleContinue}
            accessibilityLabel="Continue to plan selection"
          />
          <Button
            title="Skip - I'll set goals later"
            variant="text"
            onPress={handleContinue}
            accessibilityLabel="Skip goal setting"
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    opacity: 0.8,
    lineHeight: 24,
  },
  goalTypes: {
    gap: 12,
    marginBottom: 24,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardDisabled: {
    opacity: 0.5,
  },
  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalContent: {
    flex: 1,
  },
  goalDescription: {
    marginTop: 2,
    marginBottom: 4,
  },
  goalExample: {
    fontStyle: 'italic',
  },
  // Added goal cards
  addedGoalsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  addedGoalsList: {
    gap: 8,
  },
  addedGoalCard: {
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
  addedGoalContent: {
    flex: 1,
  },
  addedGoalTitle: {
    marginBottom: 4,
  },
  addedGoalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalDate: {
    opacity: 0.7,
  },
  // Add goal form
  addGoalForm: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priorityOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
