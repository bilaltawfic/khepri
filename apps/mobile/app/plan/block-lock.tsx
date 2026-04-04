import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useBlockPlanning } from '@/hooks/useBlockPlanning';

// ====================================================================
// Sub-components
// ====================================================================

function LockInItem({
  icon,
  label,
  colors,
}: Readonly<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  colors: typeof Colors.light;
}>) {
  return (
    <View style={styles.lockItem}>
      <Ionicons name={icon} size={20} color={colors.success} />
      <ThemedText style={styles.lockItemText}>{label}</ThemedText>
    </View>
  );
}

// ====================================================================
// Main Screen
// ====================================================================

export default function BlockLockScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { block, workouts, step, error, lockIn, isLoading } = useBlockPlanning();

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText type="subtitle" style={styles.loadingTitle}>
          Loading block details...
        </ThemedText>
      </ThemedView>
    );
  }

  const handleLockIn = useCallback(async () => {
    const success = await lockIn();
    if (success) {
      router.replace('/(tabs)/plan');
    }
  }, [lockIn]);

  if (step === 'locking') {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText type="subtitle" style={styles.loadingTitle}>
          Locking in your plan
        </ThemedText>
        <ThemedText style={styles.loadingSubtitle}>
          Saving your workouts and preparing for sync...
        </ThemedText>
      </ThemedView>
    );
  }

  if (step === 'done') {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        <ThemedText type="subtitle" style={styles.loadingTitle}>
          Plan locked in!
        </ThemedText>
        <ThemedText style={styles.loadingSubtitle}>
          Your training block is ready. Check the Plan tab to see your weekly schedule.
        </ThemedText>
        <Button
          title="Go to Plan"
          onPress={() => router.replace('/(tabs)/plan')}
          accessibilityLabel="Navigate to Plan tab"
          style={styles.doneButton}
        />
      </ThemedView>
    );
  }

  if (block == null) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>No block to lock in.</ThemedText>
        <Button
          title="Back"
          variant="secondary"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={40} color={colors.primary} />
          <ThemedText type="subtitle" style={styles.title}>
            Ready to lock in your plan?
          </ThemedText>
        </View>

        <ThemedView style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold">{block.name}</ThemedText>
          <ThemedText type="caption" style={styles.summaryDetail}>
            {block.total_weeks} weeks, {workouts.length} workouts
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            This will:
          </ThemedText>
          <LockInItem
            icon="checkmark-circle"
            label="Save all workouts to your plan"
            colors={colors}
          />
          <LockInItem
            icon="sync-circle"
            label="Push workouts to Intervals.icu (if connected)"
            colors={colors}
          />
          <LockInItem icon="analytics" label="Enable compliance tracking" colors={colors} />
          <LockInItem
            icon="chatbubble-ellipses"
            label="Allow the AI coach to suggest daily adjustments"
            colors={colors}
          />
        </ThemedView>

        {error != null && (
          <ThemedText
            type="caption"
            style={[styles.errorText, { color: colors.error }]}
            accessibilityRole="alert"
          >
            {error}
          </ThemedText>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="Lock In"
          onPress={handleLockIn}
          accessibilityLabel="Lock in your training plan"
        />
        <Button
          title="Go Back"
          variant="text"
          onPress={() => router.back()}
          accessibilityLabel="Go back to review"
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryDetail: {
    opacity: 0.7,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 12,
  },
  lockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  lockItemText: {
    flex: 1,
    lineHeight: 22,
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
  loadingTitle: {
    textAlign: 'center',
  },
  loadingSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  doneButton: {
    marginTop: 16,
  },
});
