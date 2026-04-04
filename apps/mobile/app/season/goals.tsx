import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TipCard } from '@/components/TipCard';
import { Colors } from '@/constants/Colors';
import { MAX_SEASON_GOALS, type SeasonGoalInput, useSeasonSetup } from '@/contexts';
import { seasonFormStyles } from './shared-styles';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

type GoalType = SeasonGoalInput['goalType'];

type GoalTypeConfig = {
  type: GoalType;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  example: string;
};

const GOAL_TYPES: readonly GoalTypeConfig[] = [
  {
    type: 'performance',
    icon: 'trending-up',
    title: 'Performance',
    example: 'FTP from 190W to 220W',
  },
  {
    type: 'fitness',
    icon: 'fitness',
    title: 'Fitness',
    example: 'Build to 50km running per week',
  },
  {
    type: 'health',
    icon: 'heart',
    title: 'Health',
    example: 'Stay injury-free this season',
  },
];

function getGoalTypeConfig(type: GoalType): GoalTypeConfig | undefined {
  return GOAL_TYPES.find((c) => c.type === type);
}

// =============================================================================
// GOAL TYPE CARD
// =============================================================================

type GoalTypeCardProps = Readonly<{
  config: GoalTypeConfig;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
  disabled?: boolean;
}>;

function GoalTypeCard({ config, colorScheme, onPress, disabled }: GoalTypeCardProps) {
  return (
    <Pressable
      style={[
        styles.typeCard,
        { backgroundColor: Colors[colorScheme].surface },
        disabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`Add ${config.title.toLowerCase()} goal`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View
        style={[seasonFormStyles.cardIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
      >
        <Ionicons name={config.icon} size={24} color={Colors[colorScheme].primary} />
      </View>
      <View style={seasonFormStyles.cardContent}>
        <ThemedText type="defaultSemiBold">{config.title}</ThemedText>
        <ThemedText type="caption" style={styles.example}>
          e.g. {config.example}
        </ThemedText>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={Colors[colorScheme].primary} />
    </Pressable>
  );
}

// =============================================================================
// ADD GOAL FORM
// =============================================================================

type AddGoalFormProps = Readonly<{
  goalType: GoalType;
  colorScheme: 'light' | 'dark';
  onSubmit: (goal: SeasonGoalInput) => void;
  onCancel: () => void;
}>;

function AddGoalForm({ goalType, colorScheme, onSubmit, onCancel }: AddGoalFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const config = getGoalTypeConfig(goalType);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a goal description');
      return;
    }
    onSubmit({ goalType, title: trimmedTitle });
  };

  return (
    <View style={[seasonFormStyles.form, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={seasonFormStyles.formHeader}>
        <ThemedText type="defaultSemiBold">Add {config?.title} Goal</ThemedText>
        <Pressable
          onPress={onCancel}
          accessibilityLabel="Cancel adding goal"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
        </Pressable>
      </View>

      <ThemedText type="caption" style={seasonFormStyles.formLabel}>
        Goal Description
      </ThemedText>
      <TextInput
        style={[
          seasonFormStyles.formInput,
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
        accessibilityLabel="Goal description"
      />

      {error ? (
        <ThemedText
          type="caption"
          style={[seasonFormStyles.errorText, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.formActions}>
        <Button title="Add Goal" onPress={handleSubmit} accessibilityLabel="Add goal" />
      </View>
    </View>
  );
}

// =============================================================================
// ADDED GOAL CARD
// =============================================================================

type AddedGoalCardProps = Readonly<{
  goal: SeasonGoalInput;
  index: number;
  colorScheme: 'light' | 'dark';
  onRemove: (index: number) => void;
}>;

function AddedGoalCard({ goal, index, colorScheme, onRemove }: AddedGoalCardProps) {
  const config = getGoalTypeConfig(goal.goalType);
  if (!config) return null;

  return (
    <View style={[seasonFormStyles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <View
        style={[seasonFormStyles.cardIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
      >
        <Ionicons name={config.icon} size={20} color={Colors[colorScheme].primary} />
      </View>
      <View style={seasonFormStyles.cardContent}>
        <ThemedText type="defaultSemiBold" style={styles.goalTitle}>
          {goal.title}
        </ThemedText>
        <ThemedText type="caption">{config.title}</ThemedText>
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

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function SeasonGoalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, addGoal, removeGoal } = useSeasonSetup();
  const [addingGoalType, setAddingGoalType] = useState<GoalType | null>(null);

  const isAtMax = data.goals.length >= MAX_SEASON_GOALS;

  const handleAddGoal = (goal: SeasonGoalInput) => {
    addGoal(goal);
    setAddingGoalType(null);
  };

  const handleContinue = () => {
    router.push('/season/preferences');
  };

  return (
    <ThemedView style={seasonFormStyles.container}>
      <ScrollView
        style={seasonFormStyles.scrollView}
        contentContainerStyle={seasonFormStyles.scrollContent}
      >
        <View style={seasonFormStyles.header}>
          <ThemedText type="subtitle" style={seasonFormStyles.title}>
            Other goals
          </ThemedText>
          <ThemedText style={seasonFormStyles.description}>
            Beyond racing, what else are you working toward? These help Khepri balance your
            training.
          </ThemedText>
        </View>

        {/* Show form when adding, otherwise show type picker */}
        {addingGoalType == null ? (
          <View style={styles.goalTypes}>
            {GOAL_TYPES.map((config) => (
              <GoalTypeCard
                key={config.type}
                config={config}
                colorScheme={colorScheme}
                onPress={() => setAddingGoalType(config.type)}
                disabled={isAtMax}
              />
            ))}
          </View>
        ) : (
          <AddGoalForm
            goalType={addingGoalType}
            colorScheme={colorScheme}
            onSubmit={handleAddGoal}
            onCancel={() => setAddingGoalType(null)}
          />
        )}

        {/* Added goals */}
        {data.goals.length > 0 && addingGoalType == null && (
          <View style={styles.addedSection}>
            <ThemedText type="defaultSemiBold" style={seasonFormStyles.sectionTitle}>
              Your Goals ({data.goals.length}/{MAX_SEASON_GOALS})
            </ThemedText>
            <View style={styles.goalCards}>
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

        {/* Empty state */}
        {data.goals.length === 0 && addingGoalType == null && (
          <EmptyState
            icon="flag-outline"
            iconSize={32}
            message="No goals added yet. This step is optional — you can skip to preferences."
            style={{ padding: 24, marginBottom: 16 }}
          />
        )}

        {addingGoalType == null && (
          <TipCard message="Tip: Performance goals like FTP targets help Khepri structure your intensity distribution." />
        )}
      </ScrollView>

      {addingGoalType == null && (
        <View style={seasonFormStyles.actions}>
          <Button
            title="Continue"
            onPress={handleContinue}
            accessibilityLabel="Continue to preferences"
          />
          <Button
            title="Skip - I'll set goals later"
            variant="text"
            onPress={handleContinue}
            accessibilityLabel="Skip goal setting"
          />
        </View>
      )}
    </ThemedView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  goalTypes: {
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
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
  cardDisabled: {
    opacity: 0.5,
  },
  example: {
    fontStyle: 'italic',
    marginTop: 2,
  },
  formActions: {
    marginTop: 16,
  },
  addedSection: {
    marginBottom: 24,
  },
  goalCards: {
    gap: 8,
  },
  goalTitle: {
    marginBottom: 2,
  },
});
