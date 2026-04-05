import { StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import type { NextRace } from '@/hooks/useDashboardV2';

interface PlanBlockCTAProps {
  readonly seasonName: string;
  readonly nextRace: NextRace | null;
  readonly onPlanBlock: () => void;
}

export function PlanBlockCTA({ seasonName, nextRace, onPlanBlock }: PlanBlockCTAProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <ThemedText type="subtitle">Your {seasonName} is set up!</ThemedText>

      <ThemedText style={styles.description}>Next: Plan your first training block.</ThemedText>

      {nextRace != null && (
        <ThemedText type="caption" style={styles.raceInfo}>
          Next race: {nextRace.name} (
          {new Date(`${nextRace.date}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
          )
        </ThemedText>
      )}

      <View style={styles.buttonRow}>
        <Button
          title="Plan First Block"
          onPress={onPlanBlock}
          accessibilityLabel="Plan your first training block"
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  description: {
    marginTop: 8,
    opacity: 0.8,
  },
  raceInfo: {
    marginTop: 8,
    opacity: 0.7,
  },
  buttonRow: {
    marginTop: 16,
  },
});
