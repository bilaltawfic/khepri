import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  type PeriodizationPhaseConfig,
  type WeeklyVolume,
  isPeriodizationPhase,
  isTrainingFocus,
} from '@khepri/core';
import type { TrainingPlanRow } from '@khepri/supabase-client';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';

// ---- Types ----

interface ParsedPeriodization {
  readonly phases: readonly PeriodizationPhaseConfig[];
  readonly weekly_volumes: readonly WeeklyVolume[];
}

// ---- Helper functions ----

/** Calculate which week number we're currently in (1-indexed). Returns -1 if plan hasn't started. */
function getCurrentWeek(startDate: string, totalWeeks: number): number {
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start)) return -1;
  const now = Date.now();
  const diffMs = now - start;
  if (diffMs < 0) return -1;
  const week = Math.floor(diffMs / (7 * 86_400_000)) + 1;
  return Math.min(week, totalWeeks);
}

/** Get a display color for a periodization phase. */
function getPhaseColor(phase: string, colors: typeof Colors.light): string {
  switch (phase) {
    case 'base':
      return colors.zoneEndurance;
    case 'build':
      return colors.zoneThreshold;
    case 'peak':
      return colors.zoneVO2;
    case 'taper':
    case 'recovery':
      return colors.zoneRecovery;
    default:
      return colors.primary;
  }
}

/** Get an icon name for a periodization phase. */
function getPhaseIcon(phase: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (phase) {
    case 'base':
      return 'leaf';
    case 'build':
      return 'trending-up';
    case 'peak':
      return 'flash';
    case 'taper':
      return 'battery-charging';
    case 'recovery':
      return 'bed';
    default:
      return 'fitness';
  }
}

/** Format a focus area for display. */
function formatFocus(focus: string): string {
  return focus.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a date string for display. */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Validate a single phase config object. */
function isValidPhaseConfig(phase: unknown): boolean {
  if (typeof phase !== 'object' || phase == null) return false;
  const p = phase as Record<string, unknown>;
  if (typeof p.phase !== 'string' || typeof p.weeks !== 'number' || typeof p.focus !== 'string') {
    return false;
  }
  if (!isPeriodizationPhase(p.phase) || !isTrainingFocus(p.focus)) return false;
  if (!Array.isArray(p.intensity_distribution) || p.intensity_distribution.length !== 3)
    return false;
  return p.intensity_distribution.every(
    (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  );
}

/** Validate a single weekly volume object. */
function isValidWeeklyVolume(vol: unknown): boolean {
  if (typeof vol !== 'object' || vol == null) return false;
  const v = vol as Record<string, unknown>;
  return (
    typeof v.week === 'number' &&
    Number.isFinite(v.week) &&
    v.week > 0 &&
    typeof v.volume_multiplier === 'number' &&
    Number.isFinite(v.volume_multiplier) &&
    typeof v.phase === 'string' &&
    isPeriodizationPhase(v.phase)
  );
}

/** Safely parse the periodization JSONB column with runtime validation. */
function parsePeriodization(json: unknown): ParsedPeriodization | null {
  if (typeof json !== 'object' || json == null) return null;
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.phases) || !Array.isArray(obj.weekly_volumes)) return null;
  if (!obj.phases.every(isValidPhaseConfig)) return null;
  if (!obj.weekly_volumes.every(isValidWeeklyVolume)) return null;
  return obj as unknown as ParsedPeriodization;
}

// ---- Sub-components ----

function PlanOverview({
  plan,
  currentWeek,
  colors,
}: Readonly<{
  plan: TrainingPlanRow;
  currentWeek: number;
  colors: typeof Colors.light;
}>) {
  const progress = plan.total_weeks > 0 ? Math.max(0, currentWeek) / plan.total_weeks : 0;

  return (
    <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">{plan.name}</ThemedText>
        <View
          style={[styles.statusBadge, { backgroundColor: colors.success }]}
          accessibilityRole="text"
        >
          <ThemedText style={[styles.statusText, { color: colors.textInverse }]}>Active</ThemedText>
        </View>
      </View>
      {plan.description != null && (
        <ThemedText style={styles.description}>{plan.description}</ThemedText>
      )}
      <View style={styles.dateRow}>
        <ThemedText type="caption">
          {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
        </ThemedText>
      </View>
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <ThemedText type="caption">
            {currentWeek < 0 ? 'Starts soon' : `Week ${currentWeek} of ${plan.total_weeks}`}
          </ThemedText>
          <ThemedText type="caption">{Math.round(progress * 100)}%</ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.round(Math.min(progress, 1) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>
    </ThemedView>
  );
}

function PhasesTimeline({
  phases,
  currentWeek,
  colors,
}: Readonly<{
  phases: readonly PeriodizationPhaseConfig[];
  currentWeek: number;
  colors: typeof Colors.light;
}>) {
  // Determine which phase the current week falls in
  let weekAccumulator = 0;
  let currentPhaseIndex = -1;
  for (let i = 0; i < phases.length; i++) {
    weekAccumulator += phases[i].weeks;
    if (currentWeek > 0 && currentWeek <= weekAccumulator && currentPhaseIndex === -1) {
      currentPhaseIndex = i;
    }
  }

  return (
    <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">Training Phases</ThemedText>
      </View>
      {phases.map((phase, index) => {
        const isCurrent = index === currentPhaseIndex;
        const phaseColor = getPhaseColor(phase.phase, colors);
        const icon = getPhaseIcon(phase.phase);
        const phaseName = isPeriodizationPhase(phase.phase)
          ? phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1)
          : phase.phase;

        return (
          <View
            key={`${phase.phase}-${index}`}
            style={[
              styles.phaseRow,
              isCurrent && { backgroundColor: colors.surfaceVariant, borderRadius: 12 },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${phaseName} phase, ${phase.weeks} weeks, focus: ${formatFocus(phase.focus)}${isCurrent ? ', current phase' : ''}`}
          >
            <View style={[styles.phaseIcon, { backgroundColor: phaseColor }]}>
              <Ionicons name={icon} size={16} color={colors.textInverse} />
            </View>
            <View style={styles.phaseInfo}>
              <View style={styles.phaseNameRow}>
                <ThemedText type="defaultSemiBold">{phaseName}</ThemedText>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                    <ThemedText style={[styles.currentBadgeText, { color: colors.textInverse }]}>
                      Current
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="caption">
                {phase.weeks} weeks · {formatFocus(phase.focus)}
              </ThemedText>
              <View style={styles.intensityBar}>
                <View
                  style={[
                    styles.intensitySegment,
                    {
                      flex: phase.intensity_distribution[0],
                      backgroundColor: colors.zoneEndurance,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.intensitySegment,
                    {
                      flex: phase.intensity_distribution[1],
                      backgroundColor: colors.zoneThreshold,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.intensitySegment,
                    { flex: phase.intensity_distribution[2], backgroundColor: colors.zoneVO2 },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}
      <View style={styles.intensityLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.zoneEndurance }]} />
          <ThemedText type="caption">Easy</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.zoneThreshold }]} />
          <ThemedText type="caption">Moderate</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.zoneVO2 }]} />
          <ThemedText type="caption">Hard</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

function VolumeChart({
  weeklyVolumes,
  currentWeek,
  colors,
}: Readonly<{
  weeklyVolumes: readonly WeeklyVolume[];
  currentWeek: number;
  colors: typeof Colors.light;
}>) {
  const maxVolume = weeklyVolumes.reduce((max, wv) => Math.max(max, wv.volume_multiplier), 0);
  // Guard against division by zero
  const safeMax = maxVolume > 0 ? maxVolume : 1;

  return (
    <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">Weekly Volume</ThemedText>
      </View>
      <View style={styles.volumeChartContainer}>
        {weeklyVolumes.map((wv) => {
          const isCurrent = wv.week === currentWeek;
          const barHeight = (wv.volume_multiplier / safeMax) * 100;
          const barColor = isCurrent ? colors.primary : getPhaseColor(wv.phase, colors);

          return (
            <View key={wv.week} style={styles.volumeBarWrapper}>
              <View style={styles.volumeBarTrack}>
                <View
                  style={[
                    styles.volumeBar,
                    {
                      height: `${Math.round(barHeight)}%`,
                      backgroundColor: barColor,
                      opacity: isCurrent ? 1 : 0.6,
                    },
                  ]}
                />
              </View>
              <ThemedText
                type="caption"
                style={[
                  styles.volumeLabel,
                  isCurrent && { fontWeight: '700', color: colors.primary },
                ]}
              >
                {wv.week}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

function PlanActions({
  onPause,
  onCancel,
}: Readonly<{
  onPause: () => void;
  onCancel: () => void;
}>) {
  return (
    <View style={styles.actionsRow}>
      <Button
        title="Pause Plan"
        variant="secondary"
        onPress={onPause}
        accessibilityLabel="Pause training plan"
      />
      <Button
        title="Cancel Plan"
        variant="text"
        onPress={onCancel}
        accessibilityLabel="Cancel training plan"
      />
    </View>
  );
}

// ---- Main Screen ----

export default function PlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { plan, isLoading, error, refresh, pausePlan, cancelPlan } = useTrainingPlan();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handlePause = useCallback(async () => {
    const result = await pausePlan();
    if (!result.success) {
      Alert.alert('Error', result.error ?? 'Failed to pause plan');
    }
  }, [pausePlan]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Training Plan',
      'Are you sure you want to cancel this plan? This cannot be undone.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Plan',
          style: 'destructive',
          onPress: () => {
            cancelPlan().then(
              (result) => {
                if (!result.success) {
                  Alert.alert('Error', result.error ?? 'Failed to cancel plan');
                }
              },
              () => {
                Alert.alert('Error', 'Failed to cancel plan');
              }
            );
          },
        },
      ]
    );
  }, [cancelPlan]);

  if (isLoading && !plan) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading your training plan..." />
      </ScreenContainer>
    );
  }

  if (error && !plan) {
    return (
      <ScreenContainer>
        <ErrorState
          message={error}
          title="Unable to load training plan"
          action={{ title: 'Retry', onPress: refresh }}
        />
      </ScreenContainer>
    );
  }

  if (!plan) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="clipboard-outline"
          title="No Active Training Plan"
          message="Chat with your AI coach to create a personalized training plan based on your goals."
        />
        <View style={styles.emptyAction}>
          <Button
            title="Talk to Coach"
            variant="primary"
            onPress={() => router.push('/(tabs)/chat')}
            accessibilityLabel="Navigate to AI coach to create a training plan"
          />
        </View>
      </ScreenContainer>
    );
  }

  const currentWeek = getCurrentWeek(plan.start_date, plan.total_weeks);
  const periodization = parsePeriodization(plan.periodization);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PlanOverview plan={plan} currentWeek={currentWeek} colors={colors} />

        {periodization != null && periodization.phases.length > 0 && (
          <PhasesTimeline phases={periodization.phases} currentWeek={currentWeek} colors={colors} />
        )}

        {periodization != null && periodization.weekly_volumes.length > 0 && (
          <VolumeChart
            weeklyVolumes={periodization.weekly_volumes}
            currentWeek={currentWeek}
            colors={colors}
          />
        )}

        <PlanActions onPause={handlePause} onCancel={handleCancel} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    marginBottom: 8,
    opacity: 0.7,
  },
  dateRow: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseInfo: {
    flex: 1,
    gap: 4,
  },
  phaseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  intensityBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  intensitySegment: {
    height: '100%',
  },
  intensityLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  volumeChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  volumeBarWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  volumeBarTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  volumeBar: {
    width: '100%',
    borderRadius: 3,
  },
  volumeLabel: {
    marginTop: 4,
    fontSize: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  emptyAction: {
    paddingHorizontal: 32,
    marginTop: 16,
  },
});
