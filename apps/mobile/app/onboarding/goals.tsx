import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

type GoalTypeCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  example: string;
  colorScheme: 'light' | 'dark';
  onPress?: () => void;
};

function GoalTypeCard({
  icon,
  title,
  description,
  example,
  colorScheme,
  onPress,
}: GoalTypeCardProps) {
  return (
    <Pressable
      style={[styles.goalCard, { backgroundColor: Colors[colorScheme].surface }]}
      onPress={onPress}
      accessibilityLabel={`Add ${title.toLowerCase()}`}
      accessibilityRole="button"
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

export default function GoalsScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  const handleContinue = () => {
    router.push('/onboarding/plan');
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            What are you working toward?
          </ThemedText>
          <ThemedText style={styles.description}>
            Add your goals so Khepri can tailor your training. You can add as many as you like, or
            skip and add them later.
          </ThemedText>
        </View>

        {/* Goal type cards */}
        <View style={styles.goalTypes}>
          <GoalTypeCard
            icon="trophy"
            title="Race Goal"
            description="A specific event you're training for"
            example="Complete Ironman 70.3 on June 15"
            colorScheme={colorScheme}
            onPress={() => {
              // TODO: Open add race goal modal
            }}
          />

          <GoalTypeCard
            icon="trending-up"
            title="Performance Goal"
            description="A fitness metric you want to improve"
            example="Increase FTP from 250W to 280W"
            colorScheme={colorScheme}
            onPress={() => {
              // TODO: Open add performance goal modal
            }}
          />

          <GoalTypeCard
            icon="fitness"
            title="Fitness Goal"
            description="Volume or consistency targets"
            example="Build to 40km running per week"
            colorScheme={colorScheme}
            onPress={() => {
              // TODO: Open add fitness goal modal
            }}
          />

          <GoalTypeCard
            icon="heart"
            title="Health Goal"
            description="Weight, wellness, or lifestyle targets"
            example="Lose 5kg before race season"
            colorScheme={colorScheme}
            onPress={() => {
              // TODO: Open add health goal modal
            }}
          />
        </View>

        {/* Empty state */}
        <ThemedView
          style={[styles.emptyState, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        >
          <Ionicons name="flag-outline" size={32} color={Colors[colorScheme].iconSecondary} />
          <ThemedText type="caption" style={styles.emptyText}>
            No goals added yet. Tap a goal type above to get started.
          </ThemedText>
        </ThemedView>

        {/* Tip */}
        <ThemedView style={[styles.tipCard, { borderColor: Colors[colorScheme].primary }]}>
          <Ionicons name="bulb-outline" size={20} color={Colors[colorScheme].primary} />
          <ThemedText type="caption" style={styles.tipText}>
            Tip: Start with your most important goal. Khepri will prioritize training to help you
            achieve it while keeping other goals in mind.
          </ThemedText>
        </ThemedView>
      </ScrollView>

      {/* Action buttons */}
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
  emptyState: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
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
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
