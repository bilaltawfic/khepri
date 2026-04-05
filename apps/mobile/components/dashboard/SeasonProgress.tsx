import { StyleSheet, View, useColorScheme } from 'react-native';

import { complianceColor } from '@khepri/core';
import type { RaceBlockRow } from '@khepri/supabase-client';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import type { NextRace } from '@/hooks/useDashboardV2';

interface SeasonProgressProps {
  readonly block: RaceBlockRow;
  readonly blockWeek: number;
  readonly nextRace: NextRace | null;
  readonly blockComplianceScore?: number;
  readonly blockComplianceColor?: 'green' | 'amber' | 'red';
}

export function SeasonProgress({
  block,
  blockWeek,
  nextRace,
  blockComplianceScore,
  blockComplianceColor,
}: SeasonProgressProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const progress = Math.min(blockWeek / block.total_weeks, 1);
  const pct = blockComplianceScore != null ? Math.round(blockComplianceScore * 100) : null;
  const pctColor =
    blockComplianceColor != null
      ? complianceColor(blockComplianceColor, Colors[colorScheme])
      : Colors[colorScheme].textSecondary;

  return (
    <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.blockName}>
          {block.name}
        </ThemedText>
        <ThemedText type="caption">
          Week {blockWeek} of {block.total_weeks}
        </ThemedText>
        {pct != null && (
          <ThemedText type="defaultSemiBold" style={{ color: pctColor }}>
            {pct}%
          </ThemedText>
        )}
      </View>

      <View style={[styles.progressTrack, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: Colors[colorScheme].primary,
            },
          ]}
        />
      </View>

      {nextRace != null && (
        <ThemedText type="caption" style={styles.raceInfo}>
          {nextRace.name} &middot;{' '}
          {new Date(`${nextRace.date}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}{' '}
          ({nextRace.daysUntil} days)
        </ThemedText>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  blockName: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  raceInfo: {
    marginTop: 8,
    opacity: 0.7,
  },
});
