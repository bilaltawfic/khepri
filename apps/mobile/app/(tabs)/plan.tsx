import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  type PeriodizationPhaseConfig,
  type WeeklyCompliance,
  type WeeklyVolume,
  type WorkoutComplianceResult,
  computeBlockCompliance,
  computeWeeklyCompliance,
  computeWorkoutCompliance,
  isPeriodizationPhase,
  isTrainingFocus,
  parseDateOnly,
} from '@khepri/core';
import type { RaceBlockRow, TrainingPlanRow, WorkoutRow } from '@khepri/supabase-client';
import { getActiveBlock, getAthleteByAuthUser, getBlockWorkouts } from '@khepri/supabase-client';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AdaptationCard } from '@/components/adaptation/AdaptationCard';
import type { AdaptationType } from '@/components/adaptation/AdaptationCard';
import { ComplianceDot } from '@/components/compliance/ComplianceDot';
import { ComplianceScore } from '@/components/compliance/ComplianceScore';
import { WeekTimeline } from '@/components/compliance/WeekTimeline';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts';
import { useAdaptations } from '@/hooks/useAdaptations';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { supabase } from '@/lib/supabase';
import {
  formatWorkoutDuration,
  getAdaptationWorkoutPair,
  getSportIcon,
} from '@/utils/plan-helpers';
import { router } from 'expo-router';

const VALID_ADAPTATION_TYPES_SET = new Set([
  'no_change',
  'reduce_intensity',
  'reduce_duration',
  'increase_intensity',
  'swap_days',
  'add_rest',
  'substitute',
]);

function parsePlanAdaptationType(value: unknown): AdaptationType {
  return typeof value === 'string' && VALID_ADAPTATION_TYPES_SET.has(value)
    ? (value as AdaptationType)
    : 'reduce_intensity';
}

// ---- Types ----

interface ParsedPeriodization {
  readonly phases: readonly PeriodizationPhaseConfig[];
  readonly weekly_volumes: readonly WeeklyVolume[];
}

// ---- Helper functions ----

function getCurrentWeek(startDate: string, totalWeeks: number): number {
  const start = parseDateOnly(startDate).getTime();
  if (Number.isNaN(start)) return -1;
  const now = Date.now();
  const diffMs = now - start;
  if (diffMs < 0) return -1;
  const week = Math.floor(diffMs / (7 * 86_400_000)) + 1;
  return Math.min(week, totalWeeks);
}

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

function formatFocus(focus: string): string {
  return focus.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function addWeeks(dateStr: string, weeks: number): Date {
  const date = parseDateOnly(dateStr);
  date.setDate(date.getDate() + weeks * 7);
  return date;
}

function isToday(dateStr: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateStr === today;
}

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

function parsePeriodization(json: unknown): ParsedPeriodization | null {
  if (typeof json !== 'object' || json == null) return null;
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.phases) || !Array.isArray(obj.weekly_volumes)) return null;
  if (!obj.phases.every(isValidPhaseConfig)) return null;
  if (!obj.weekly_volumes.every(isValidWeeklyVolume)) return null;
  return obj as unknown as ParsedPeriodization;
}

// ---- Compliance helpers ----

/**
 * Derive a compliance dot score for a single workout.
 * - Future workout (date not yet passed): null → grey outline
 * - Past workout with no completion: 'missed' → red
 * - Completed workout: computed score → green / amber / red
 */
function getWorkoutDotScore(workout: {
  readonly completed_at: string | null;
  readonly date: string;
  readonly planned_duration_minutes: number;
  readonly planned_tss: number | null;
  readonly planned_distance_meters: number | null;
  readonly actual_duration_minutes: number | null;
  readonly actual_tss: number | null;
  readonly actual_distance_meters: number | null;
}): WorkoutComplianceResult['score'] | null {
  const isPast = new Date(`${workout.date}T23:59:59`).getTime() < Date.now();

  if (workout.completed_at == null) {
    return isPast ? 'missed' : null;
  }

  const result = computeWorkoutCompliance(
    {
      duration_minutes: workout.planned_duration_minutes,
      tss: workout.planned_tss,
      distance_meters: workout.planned_distance_meters,
    },
    {
      duration_minutes: workout.actual_duration_minutes ?? 0,
      tss: workout.actual_tss,
      distance_meters: workout.actual_distance_meters,
    }
  );
  return result.score;
}

/**
 * Build WeeklyCompliance objects (one per week) from all block workouts.
 * Returns an array indexed 0…(totalWeeks-1).
 */
function buildWeeklyCompliance(
  workouts: readonly {
    readonly week_number: number;
    readonly completed_at: string | null;
    readonly date: string;
    readonly planned_duration_minutes: number;
    readonly planned_tss: number | null;
    readonly planned_distance_meters: number | null;
    readonly actual_duration_minutes: number | null;
    readonly actual_tss: number | null;
    readonly actual_distance_meters: number | null;
  }[],
  totalWeeks: number
): readonly (WeeklyCompliance | null)[] {
  // Group workouts by week
  const byWeek = new Map<number, (typeof workouts)[number][]>();
  for (const w of workouts) {
    let existing = byWeek.get(w.week_number);
    if (existing == null) {
      existing = [];
      byWeek.set(w.week_number, existing);
    }
    existing.push(w);
  }

  return Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const weekWorkouts = byWeek.get(weekNum);
    if (weekWorkouts == null || weekWorkouts.length === 0) return null;

    // Only compute compliance for weeks that have at least one past workout
    const hasPastWorkout = weekWorkouts.some(
      (w) => new Date(`${w.date}T23:59:59`).getTime() < Date.now()
    );
    if (!hasPastWorkout) return null;

    // Only include past or already-completed workouts. Future incomplete workouts
    // are excluded so they are not counted as missed, which would deflate the score.
    const items = weekWorkouts
      .filter((w) => {
        const isPast = new Date(`${w.date}T23:59:59`).getTime() < Date.now();
        return isPast || w.completed_at != null;
      })
      .map((w) => {
        const compliance =
          w.completed_at == null
            ? null // missed past workout
            : computeWorkoutCompliance(
                {
                  duration_minutes: w.planned_duration_minutes,
                  tss: w.planned_tss,
                  distance_meters: w.planned_distance_meters,
                },
                {
                  duration_minutes: w.actual_duration_minutes ?? 0,
                  tss: w.actual_tss,
                  distance_meters: w.actual_distance_meters,
                }
              );

        return {
          compliance,
          planned_duration_minutes: w.planned_duration_minutes,
          actual_duration_minutes: w.actual_duration_minutes,
          planned_tss: w.planned_tss,
          actual_tss: w.actual_tss,
        };
      });

    return computeWeeklyCompliance(items);
  });
}

// ---- Active Block View Sub-components ----

function ActiveBlockHeader({
  block,
  currentWeek,
  blockComplianceScore,
  colors,
}: Readonly<{
  block: RaceBlockRow;
  currentWeek: number;
  blockComplianceScore: number | null;
  colors: typeof Colors.light;
}>) {
  const phases = block.phases as readonly { name: string; focus: string; weeks: number }[] | null;

  // Find which phase currentWeek falls in by accumulating week counts
  let currentPhase: { name: string; focus: string } | null = null;
  if (phases != null && phases.length > 0) {
    let accumulated = 0;
    for (const phase of phases) {
      accumulated += phase.weeks;
      if (currentWeek <= accumulated) {
        currentPhase = phase;
        break;
      }
    }
    currentPhase ??= phases.at(-1) ?? null;
  }

  return (
    <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">{block.name}</ThemedText>
        {blockComplianceScore != null && (
          <ComplianceScore value={blockComplianceScore} fontSize={16} />
        )}
      </View>
      <ThemedText type="caption">
        Week {currentWeek} of {block.total_weeks}
        {currentPhase == null ? '' : ` · ${currentPhase.focus}`}
      </ThemedText>
    </ThemedView>
  );
}

function WeekNavigation({
  currentWeek,
  totalWeeks,
  selectedWeek,
  onChangeWeek,
  colors,
}: Readonly<{
  currentWeek: number;
  totalWeeks: number;
  selectedWeek: number;
  onChangeWeek: (week: number) => void;
  colors: typeof Colors.light;
}>) {
  return (
    <View style={styles.weekNav}>
      <Pressable
        onPress={() => onChangeWeek(Math.max(1, selectedWeek - 1))}
        disabled={selectedWeek <= 1}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Previous week"
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={selectedWeek <= 1 ? colors.surfaceVariant : colors.text}
        />
      </Pressable>
      <View style={styles.weekNavCenter}>
        <ThemedText type="defaultSemiBold">Week {selectedWeek}</ThemedText>
        {selectedWeek === currentWeek && (
          <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
            <ThemedText style={[styles.currentBadgeText, { color: colors.textInverse }]}>
              Current
            </ThemedText>
          </View>
        )}
      </View>
      <Pressable
        onPress={() => onChangeWeek(Math.min(totalWeeks, selectedWeek + 1))}
        disabled={selectedWeek >= totalWeeks}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Next week"
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={selectedWeek >= totalWeeks ? colors.surfaceVariant : colors.text}
        />
      </Pressable>
    </View>
  );
}

function WorkoutRowItem({
  workout,
  colors,
}: Readonly<{ workout: WorkoutRow; colors: typeof Colors.light }>) {
  const dotScore = getWorkoutDotScore(workout);
  const today = isToday(workout.date);

  return (
    <View
      style={[
        styles.workoutRow,
        today && { backgroundColor: `${colors.primary}10`, borderRadius: 10 },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${workout.name}, ${formatWorkoutDuration(workout.planned_duration_minutes)}${today ? ', today' : ''}`}
    >
      <Ionicons name={getSportIcon(workout.sport)} size={20} color={colors.primary} />
      <View style={styles.workoutRowInfo}>
        <ThemedText type={today ? 'defaultSemiBold' : 'default'} numberOfLines={1}>
          {workout.name}
        </ThemedText>
        <ThemedText type="caption">
          {formatDate(workout.date)} · {formatWorkoutDuration(workout.planned_duration_minutes)}
          {today ? ' ← TODAY' : ''}
        </ThemedText>
      </View>
      <ComplianceDot score={dotScore} size={12} />
    </View>
  );
}

function WeeklyHoursSummary({
  weekWorkouts,
  colors,
}: Readonly<{ weekWorkouts: readonly WorkoutRow[]; colors: typeof Colors.light }>) {
  const totalMinutes = weekWorkouts.reduce((sum, w) => sum + w.planned_duration_minutes, 0);
  const hours = (totalMinutes / 60).toFixed(1);

  return (
    <View style={[styles.hoursSummary, { backgroundColor: colors.surfaceVariant }]}>
      <ThemedText type="caption">Weekly hours: {hours}h planned</ThemedText>
    </View>
  );
}

// ---- Legacy Plan Sub-components ----

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
  startDate,
}: Readonly<{
  phases: readonly PeriodizationPhaseConfig[];
  currentWeek: number;
  colors: typeof Colors.light;
  startDate: string;
}>) {
  let weekAccumulator = 0;
  let currentPhaseIndex = -1;
  for (let i = 0; i < phases.length; i++) {
    weekAccumulator += phases[i].weeks;
    if (currentWeek > 0 && currentWeek <= weekAccumulator && currentPhaseIndex === -1) {
      currentPhaseIndex = i;
    }
  }

  const phaseStartWeeks: number[] = [];
  let acc = 0;
  for (const phase of phases) {
    phaseStartWeeks.push(acc);
    acc += phase.weeks;
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
              <ThemedText type="caption" style={{ opacity: 0.7 }}>
                {formatShortDate(addWeeks(startDate, phaseStartWeeks[index]))} –{' '}
                {formatShortDate(addWeeks(startDate, phaseStartWeeks[index] + phase.weeks))}
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
  startDate,
}: Readonly<{
  weeklyVolumes: readonly WeeklyVolume[];
  currentWeek: number;
  colors: typeof Colors.light;
  startDate: string;
}>) {
  const maxVolume = weeklyVolumes.reduce((max, wv) => Math.max(max, wv.volume_multiplier), 0);
  const safeMax = maxVolume > 0 ? maxVolume : 1;

  const planStart = parseDateOnly(startDate);
  const planEnd = addWeeks(startDate, weeklyVolumes.length);
  const dateRange = Number.isNaN(planStart.getTime())
    ? ''
    : `${formatShortDate(planStart)} – ${formatShortDate(planEnd)}`;

  return (
    <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText type="subtitle">Weekly Volume</ThemedText>
          {dateRange !== '' && (
            <ThemedText type="caption" style={{ opacity: 0.7 }}>
              {dateRange}
            </ThemedText>
          )}
        </View>
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
  onCancel,
}: Readonly<{
  onCancel: () => void;
}>) {
  return (
    <View style={styles.actionsRow}>
      <Button
        title="Cancel Plan"
        variant="text"
        onPress={onCancel}
        accessibilityLabel="Cancel training plan"
      />
    </View>
  );
}

// ---- Active Block View ----

function ActiveBlockView({
  block,
  workouts,
  colors,
  onRefresh,
  refreshing,
}: Readonly<{
  block: RaceBlockRow;
  workouts: readonly WorkoutRow[];
  colors: typeof Colors.light;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}>) {
  const rawCurrentWeek = getCurrentWeek(block.start_date, block.total_weeks);
  // Clamp to 1 when block hasn't started yet (rawCurrentWeek is -1)
  const currentWeek = Math.max(1, rawCurrentWeek);
  const [selectedWeek, setSelectedWeek] = useState(() => currentWeek);

  const weekWorkouts = workouts.filter((w) => w.week_number === selectedWeek);
  const weekNumbers = [...new Set(workouts.map((w) => w.week_number))].sort((a, b) => a - b);
  const totalWeeks =
    weekNumbers.length > 0 ? (weekNumbers.at(-1) ?? block.total_weeks) : block.total_weeks;

  // Compliance data
  const weeklyCompliance = buildWeeklyCompliance(workouts, totalWeeks);
  const scoredWeeks = weeklyCompliance.filter((w): w is WeeklyCompliance => w != null);
  const blockCompliance = scoredWeeks.length > 0 ? computeBlockCompliance(scoredWeeks) : null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ActiveBlockHeader
        block={block}
        currentWeek={currentWeek}
        blockComplianceScore={blockCompliance?.overall_score ?? null}
        colors={colors}
      />
      {weeklyCompliance.some((w) => w != null) && (
        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="caption" style={{ marginBottom: 8, opacity: 0.7 }}>
            Weekly Compliance
          </ThemedText>
          <WeekTimeline weeks={weeklyCompliance} currentWeek={currentWeek} />
        </ThemedView>
      )}
      <WeekNavigation
        currentWeek={currentWeek}
        totalWeeks={totalWeeks}
        selectedWeek={selectedWeek}
        onChangeWeek={setSelectedWeek}
        colors={colors}
      />

      {weekWorkouts.length > 0 ? (
        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          {weekWorkouts.map((workout) => (
            <WorkoutRowItem key={workout.id} workout={workout} colors={colors} />
          ))}
          <WeeklyHoursSummary weekWorkouts={weekWorkouts} colors={colors} />
        </ThemedView>
      ) : (
        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="caption" style={{ textAlign: 'center', opacity: 0.7 }}>
            No workouts for this week
          </ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

// ---- Main Screen ----

export default function PlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { plan, isLoading: planLoading, error: planError, refetch, cancelPlan } = useTrainingPlan();
  const {
    pendingAdaptations,
    accept: acceptAdaptation,
    reject: rejectAdaptation,
  } = useAdaptations();
  const [refreshing, setRefreshing] = useState(false);

  // Active block state
  const [activeBlock, setActiveBlock] = useState<RaceBlockRow | null>(null);
  const [blockWorkouts, setBlockWorkouts] = useState<readonly WorkoutRow[]>([]);
  const [blockLoading, setBlockLoading] = useState(true);

  const loadActiveBlock = useCallback(async () => {
    if (!supabase || !user?.id) {
      setBlockLoading(false);
      return;
    }

    try {
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);
      if (athleteResult.error || !athleteResult.data) {
        setActiveBlock(null);
        setBlockWorkouts([]);
        setBlockLoading(false);
        return;
      }

      // getActiveBlock returns only status='in_progress' blocks. Locked blocks are
      // not yet active — they transition to in_progress when the start date arrives.
      const blockResult = await getActiveBlock(supabase, athleteResult.data.id);
      if (blockResult.data == null) {
        setActiveBlock(null);
        setBlockWorkouts([]);
      } else {
        setActiveBlock(blockResult.data);
        const workoutsResult = await getBlockWorkouts(supabase, blockResult.data.id);
        // Explicitly reset workouts even if fetch fails to avoid stale data
        setBlockWorkouts(workoutsResult.data ?? []);
      }
    } catch {
      // Fall through to legacy plan view — clear block state to avoid stale display
      setActiveBlock(null);
      setBlockWorkouts([]);
    } finally {
      setBlockLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadActiveBlock();
  }, [loadActiveBlock]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), loadActiveBlock()]);
    setRefreshing(false);
  }, [refetch, loadActiveBlock]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Training Plan',
      'Your plan will be cancelled and you\u2019ll need to create a new one to continue training.',
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

  const isLoading = planLoading || blockLoading;

  if (isLoading && !plan && activeBlock == null) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <LoadingState message="Loading your training plan..." />
      </ScreenContainer>
    );
  }

  if (planError && !plan && activeBlock == null) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <ErrorState
          message={planError}
          title="Unable to load training plan"
          action={{ title: 'Retry', onPress: onRefresh }}
        />
      </ScreenContainer>
    );
  }

  // Active block view takes priority
  if (activeBlock != null) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        {pendingAdaptations.length > 0 && (
          <View style={styles.adaptationBanner}>
            {pendingAdaptations.map((adaptation) => {
              const workoutPair = getAdaptationWorkoutPair(adaptation.affected_workouts);
              if (workoutPair == null) return null;
              const ctxData = adaptation.context as Record<string, unknown> | null;
              const adaptationType = parsePlanAdaptationType(ctxData?.adaptationType);
              return (
                <AdaptationCard
                  key={adaptation.id}
                  adaptationId={adaptation.id}
                  adaptationType={adaptationType}
                  reason={adaptation.reason}
                  originalWorkout={workoutPair.original}
                  modifiedWorkout={workoutPair.modified}
                  onAccept={acceptAdaptation}
                  onReject={rejectAdaptation}
                />
              );
            })}
          </View>
        )}
        <ActiveBlockView
          block={activeBlock}
          workouts={blockWorkouts}
          colors={colors}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      </ScreenContainer>
    );
  }

  // No plan and no block: show create form or block setup prompt
  if (!plan) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">Plan Your Training Block</ThemedText>
            </View>
            <ThemedText style={styles.createDescription}>
              Set up your next training block with personalized workouts based on your season plan.
            </ThemedText>
          </ThemedView>
          <View style={styles.createActions}>
            <Button
              title="Start Block Setup"
              variant="primary"
              onPress={() => router.push('/plan/block-setup')}
              accessibilityLabel="Start block setup"
            />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Legacy plan view (backward compatible)
  const currentWeek = getCurrentWeek(plan.start_date, plan.total_weeks);
  const periodization = parsePeriodization(plan.periodization);

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PlanOverview plan={plan} currentWeek={currentWeek} colors={colors} />

        {periodization != null && periodization.phases.length > 0 && (
          <PhasesTimeline
            phases={periodization.phases}
            currentWeek={currentWeek}
            colors={colors}
            startDate={plan.start_date}
          />
        )}

        {periodization != null && periodization.weekly_volumes.length > 0 && (
          <VolumeChart
            weeklyVolumes={periodization.weekly_volumes}
            currentWeek={currentWeek}
            colors={colors}
            startDate={plan.start_date}
          />
        )}

        <PlanActions onCancel={handleCancel} />
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
  adaptationBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  createDescription: {
    marginBottom: 16,
    opacity: 0.8,
    lineHeight: 22,
  },
  createActions: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  // Active block styles
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  weekNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  workoutRowInfo: {
    flex: 1,
    gap: 2,
  },
  hoursSummary: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
