import { useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

type PlanOption = 'structured' | 'daily' | null;

type PlanOptionCardProps = {
  selected: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  features: string[];
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

function PlanOptionCard({
  selected,
  icon,
  title,
  description,
  features,
  colorScheme,
  onPress,
}: PlanOptionCardProps) {
  return (
    <Pressable
      style={[
        styles.planCard,
        {
          backgroundColor: Colors[colorScheme].surface,
          borderColor: selected
            ? Colors[colorScheme].primary
            : Colors[colorScheme].border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      accessibilityLabel={`Select ${title}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.planHeader}>
        <View
          style={[
            styles.planIcon,
            {
              backgroundColor: selected
                ? Colors[colorScheme].primary
                : Colors[colorScheme].surfaceVariant,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={28}
            color={
              selected
                ? Colors[colorScheme].textInverse
                : Colors[colorScheme].primary
            }
          />
        </View>
        <View style={styles.planTitleRow}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {selected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={Colors[colorScheme].primary}
            />
          )}
        </View>
      </View>

      <ThemedText style={styles.planDescription}>{description}</ThemedText>

      <View style={styles.features}>
        {features.map((feature) => (
          <View key={`${title}-${feature}`} style={styles.featureRow}>
            <Ionicons
              name="checkmark"
              size={18}
              color={Colors[colorScheme].success}
            />
            <ThemedText type="caption" style={styles.featureText}>
              {feature}
            </ThemedText>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function PlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(12);

  const handleFinish = () => {
    // TODO: Save onboarding preferences
    router.replace('/(tabs)');
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            How would you like to train?
          </ThemedText>
          <ThemedText style={styles.description}>
            Choose how Khepri should guide your training. You can switch between
            these modes at any time.
          </ThemedText>
        </View>

        {/* Plan options */}
        <View style={styles.planOptions}>
          <PlanOptionCard
            selected={selectedPlan === 'structured'}
            icon="calendar"
            title="Structured Training Plan"
            description="Khepri creates a periodized plan with phases (base, build, peak, taper) working toward your goals."
            features={[
              'Periodized training blocks',
              'Progressive overload built-in',
              'Automatic adjustments for missed workouts',
              'Recovery weeks scheduled',
            ]}
            colorScheme={colorScheme}
            onPress={() => setSelectedPlan('structured')}
          />

          <PlanOptionCard
            selected={selectedPlan === 'daily'}
            icon="today"
            title="Daily Suggestions"
            description="No long-term plan - just smart daily workout suggestions based on how you're feeling."
            features={[
              'Flexible day-to-day training',
              'Great for maintenance periods',
              'Adapts to your schedule',
              'No commitment required',
            ]}
            colorScheme={colorScheme}
            onPress={() => setSelectedPlan('daily')}
          />
        </View>

        {/* Duration selector (only for structured plan) */}
        {selectedPlan === 'structured' && (
          <ThemedView
            style={[
              styles.durationSection,
              { backgroundColor: Colors[colorScheme].surfaceVariant },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={styles.durationTitle}>
              Plan Duration
            </ThemedText>
            <ThemedText type="caption" style={styles.durationHint}>
              How many weeks should your training plan be?
            </ThemedText>
            <View style={styles.durationOptions}>
              {[4, 8, 12, 16, 20].map((weeks) => (
                <Pressable
                  key={weeks}
                  style={[
                    styles.durationChip,
                    {
                      borderColor:
                        selectedDuration === weeks
                          ? Colors[colorScheme].primary
                          : Colors[colorScheme].border,
                      backgroundColor:
                        selectedDuration === weeks
                          ? Colors[colorScheme].primary
                          : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedDuration(weeks)}
                  accessibilityLabel={`Select ${weeks} week duration`}
                  accessibilityRole="button"
                >
                  <ThemedText
                    type="caption"
                    style={
                      selectedDuration === weeks
                        ? { color: Colors[colorScheme].textInverse }
                        : undefined
                    }
                  >
                    {weeks} weeks
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ThemedView>
        )}

        {/* Info note */}
        <ThemedView
          style={[
            styles.infoCard,
            { backgroundColor: Colors[colorScheme].surfaceVariant },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors[colorScheme].icon}
          />
          <ThemedText type="caption" style={styles.infoText}>
            Both options use AI to personalize workouts based on your daily
            check-in, recent training load, and goals.
          </ThemedText>
        </ThemedView>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={[
            styles.finishButton,
            {
              backgroundColor: selectedPlan
                ? Colors[colorScheme].primary
                : Colors[colorScheme].surfaceVariant,
            },
          ]}
          onPress={handleFinish}
          disabled={!selectedPlan}
          accessibilityLabel="Start training"
          accessibilityRole="button"
        >
          <ThemedText
            style={[
              styles.finishButtonText,
              {
                color: selectedPlan
                  ? Colors[colorScheme].textInverse
                  : Colors[colorScheme].textTertiary,
              },
            ]}
          >
            Start Training
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.skipButton}
          onPress={handleFinish}
          accessibilityLabel="Decide later"
          accessibilityRole="button"
        >
          <ThemedText
            style={[
              styles.skipButtonText,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            Decide later
          </ThemedText>
        </Pressable>
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
  planOptions: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planDescription: {
    marginBottom: 16,
    opacity: 0.8,
    lineHeight: 22,
  },
  features: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    flex: 1,
  },
  durationSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  durationTitle: {
    marginBottom: 4,
  },
  durationHint: {
    marginBottom: 12,
    opacity: 0.7,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  finishButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
});
