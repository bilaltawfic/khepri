import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { parseDateOnly } from '@khepri/core';
import { getActiveBlock, getAthleteByAuthUser, getBlockWorkouts } from '@khepri/supabase-client';
import type { RaceBlockRow, WorkoutRow } from '@khepri/supabase-client';

// =============================================================================
// Helpers
// =============================================================================

function getAiAnalysisText(overallPct: number): string {
  if (overallPct >= 85) {
    return 'Strong block — consistent training across the entire period. Great work maintaining your plan. Consider adding more quality sessions in the next block to build on this fitness base.';
  }
  if (overallPct >= 60) {
    return 'Good effort across the block. Some weeks were disrupted but you maintained momentum. For the next block, focus on protecting your key quality sessions when life gets busy.';
  }
  return 'This was a challenging block. Life happens — what matters is staying consistent long-term. Consider a slightly lower volume block next to rebuild rhythm and confidence.';
}

function getComplianceEmoji(color: string): string {
  switch (color) {
    case 'green':
      return '🟢';
    case 'amber':
      return '🟡';
    case 'red':
      return '🔴';
    default:
      return '⬜';
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatDate(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateBlockStats(workouts: WorkoutRow[]): {
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
  totalWeeks: number;
  weekCompliances: string[];
} {
  if (workouts.length === 0) {
    return {
      plannedMinutes: 0,
      completedMinutes: 0,
      completionRate: 0,
      totalWeeks: 0,
      weekCompliances: [],
    };
  }

  const plannedMinutes = workouts.reduce((sum, w) => sum + w.planned_duration_minutes, 0);
  const completedMinutes = workouts.reduce((sum, w) => sum + (w.actual_duration_minutes ?? 0), 0);
  const completionRate = plannedMinutes > 0 ? Math.min(completedMinutes / plannedMinutes, 1) : 0;

  const weekNumbers = [...new Set(workouts.map((w) => w.week_number))].sort((a, b) => a - b);
  const weekCompliances: string[] = weekNumbers.map((wk) => {
    const weekWorkouts = workouts.filter((w) => w.week_number === wk);
    const wkPlanned = weekWorkouts.reduce((s, w) => s + w.planned_duration_minutes, 0);
    const wkCompleted = weekWorkouts.reduce((s, w) => s + (w.actual_duration_minutes ?? 0), 0);
    const rate = wkPlanned > 0 ? Math.min(wkCompleted / wkPlanned, 1) : 0;
    if (rate >= 0.85) return 'green';
    if (rate >= 0.6) return 'amber';
    return 'red';
  });

  return {
    plannedMinutes,
    completedMinutes,
    completionRate,
    totalWeeks: weekNumbers.length,
    weekCompliances,
  };
}

// =============================================================================
// Sub-components
// =============================================================================

function StatRow({
  label,
  value,
  colors,
}: Readonly<{
  label: string;
  value: string;
  colors: typeof Colors.light;
}>) {
  return (
    <View style={styles.statRow}>
      <ThemedText type="caption" style={{ color: colors.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export default function BlockReviewCompleteScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [block, setBlock] = useState<RaceBlockRow | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      if (!user?.id || !supabase) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: athlete, error: athleteError } = await getAthleteByAuthUser(
          supabase,
          user.id
        );
        if (!isCurrent) return;
        if (athleteError || !athlete) {
          setError('Could not load athlete profile.');
          setIsLoading(false);
          return;
        }

        const { data: activeBlock, error: blockError } = await getActiveBlock(supabase, athlete.id);
        if (!isCurrent) return;
        if (blockError || !activeBlock) {
          setError('No active training block found.');
          setIsLoading(false);
          return;
        }

        const { data: blockWorkouts, error: workoutsError } = await getBlockWorkouts(
          supabase,
          activeBlock.id
        );
        if (!isCurrent) return;
        if (workoutsError) {
          setError('Could not load workouts.');
          setIsLoading(false);
          return;
        }

        setBlock(activeBlock);
        setWorkouts(blockWorkouts ?? []);
      } catch (err) {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : 'Failed to load block data');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  const handlePlanNextBlock = useCallback(() => {
    router.push('/plan/block-setup' as never);
  }, []);

  const handleBack = useCallback(() => {
    router.replace('/(tabs)/' as never);
  }, []);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading block summary..." />
      </ThemedView>
    );
  }

  if (error != null || block == null) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={colors.warning} />
          <ThemedText type="subtitle" style={styles.centeredTitle}>
            Unable to load review
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary }}>{error}</ThemedText>
          <Button
            title="Back to Dashboard"
            variant="secondary"
            onPress={handleBack}
            accessibilityLabel="Return to dashboard"
          />
        </View>
      </ThemedView>
    );
  }

  const stats = calculateBlockStats(workouts);
  const overallPct = Math.round(stats.completionRate * 100);
  let overallColor = colors.error;
  if (overallPct >= 85) {
    overallColor = colors.success;
  } else if (overallPct >= 60) {
    overallColor = colors.warning;
  }

  const greenCount = stats.weekCompliances.filter((c) => c === 'green').length;
  const amberCount = stats.weekCompliances.filter((c) => c === 'amber').length;
  const redCount = stats.weekCompliances.filter((c) => c === 'red').length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Ionicons name="trophy" size={40} color={colors.secondary} />
          <ThemedText type="title" style={styles.blockName}>
            Block Complete
          </ThemedText>
          <ThemedText type="subtitle" style={{ color: colors.textSecondary }}>
            {block.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: colors.textTertiary }}>
            {formatDate(block.start_date)} – {formatDate(block.end_date)} · {block.total_weeks}{' '}
            weeks
          </ThemedText>
        </View>

        {/* Overall compliance */}
        <View
          style={[
            styles.complianceCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.complianceBadgeRow}>
            <ThemedText type="title" style={[styles.compliancePct, { color: overallColor }]}>
              {overallPct}%
            </ThemedText>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              Overall Compliance
            </ThemedText>
          </View>

          {/* Week dots */}
          {stats.weekCompliances.length > 0 && (
            <ThemedText
              style={styles.weekDots}
              accessibilityLabel={`Weekly compliance: ${greenCount} green, ${amberCount} amber, ${redCount} red`}
            >
              {stats.weekCompliances.map((c) => getComplianceEmoji(c)).join('')}
            </ThemedText>
          )}

          <View style={styles.complianceLegend} accessibilityElementsHidden>
            <ThemedText type="caption" style={{ color: colors.textSecondary }}>
              🟢 {greenCount} · 🟡 {amberCount} · 🔴 {redCount}
            </ThemedText>
          </View>
        </View>

        {/* Key metrics */}
        <View
          style={[
            styles.metricsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            Key Metrics
          </ThemedText>
          <StatRow label="Planned" value={formatDuration(stats.plannedMinutes)} colors={colors} />
          <StatRow
            label="Completed"
            value={formatDuration(stats.completedMinutes)}
            colors={colors}
          />
          <StatRow label="Completion rate" value={`${overallPct}%`} colors={colors} />
          <StatRow label="Total weeks" value={`${stats.totalWeeks}`} colors={colors} />
        </View>

        {/* AI Analysis placeholder */}
        <View
          style={[
            styles.analysisCard,
            { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
          ]}
        >
          <View style={styles.analysisHeader}>
            <Ionicons name="analytics" size={18} color={colors.primary} />
            <ThemedText type="defaultSemiBold">AI Analysis</ThemedText>
          </View>
          <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            {getAiAnalysisText(overallPct)}
          </ThemedText>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Plan Next Block"
          onPress={handlePlanNextBlock}
          accessibilityLabel="Start planning the next training block"
        />
        <Button
          title="Back to Dashboard"
          variant="text"
          onPress={handleBack}
          accessibilityLabel="Return to dashboard"
        />
      </View>
    </ThemedView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  headerSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  blockName: {
    marginTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  centeredTitle: {
    textAlign: 'center',
  },
  complianceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  complianceBadgeRow: {
    alignItems: 'center',
    gap: 4,
  },
  compliancePct: {
    fontSize: 48,
    lineHeight: 56,
  },
  weekDots: {
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  complianceLegend: {
    alignItems: 'center',
  },
  metricsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actions: {
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
});
