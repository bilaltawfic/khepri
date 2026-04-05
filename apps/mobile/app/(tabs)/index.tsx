import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { parseDateOnly } from '@khepri/core';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MarkdownText } from '@/components/MarkdownText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WeekOverviewCard } from '@/components/WeekOverviewCard';
import { AdaptationBanner } from '@/components/dashboard/AdaptationBanner';
import { PlanBlockCTA } from '@/components/dashboard/PlanBlockCTA';
import { SeasonProgress } from '@/components/dashboard/SeasonProgress';
import { TodayWorkout } from '@/components/dashboard/TodayWorkout';
import { Upcoming } from '@/components/dashboard/Upcoming';
import { WeekSummary } from '@/components/dashboard/WeekSummary';
import { Colors } from '@/constants/Colors';
import {
  type DashboardData,
  type RecentActivity,
  type UpcomingEvent,
  useAdaptations,
  useDashboard,
  useDashboardV2,
  useWeekOverview,
} from '@/hooks';

// ============================================================================
// Existing helper functions (preserved from original dashboard)
// ============================================================================

function formatEventDate(dateStr: string): string {
  const date = parseDateOnly(dateStr);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays < 0) return formatted;
  if (diffDays === 0) return `${formatted} (today)`;
  if (diffDays === 1) return `${formatted} (tomorrow)`;
  if (diffDays < 7) return `${formatted} (${diffDays}d)`;

  const weeks = Math.round(diffDays / 7);
  return `${formatted} (${weeks}w)`;
}

function formatMetricValue(value: number | null): string {
  if (value == null) return '--';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getFormStatus(tsb: number | null): {
  label: string;
  description: string;
  color: 'success' | 'info' | 'warning';
} {
  if (tsb == null) return { label: '', description: '', color: 'info' };
  if (tsb > 5)
    return {
      label: 'Fresh',
      description: 'Your fitness exceeds fatigue — good time for harder efforts.',
      color: 'success',
    };
  if (tsb < -10)
    return {
      label: 'Fatigued',
      description: 'Recent training load is high — consider recovery or easier sessions.',
      color: 'warning',
    };
  return {
    label: 'Optimal',
    description: 'Good balance of fitness and fatigue — sustainable training zone.',
    color: 'info',
  };
}

function TrainingLoadContent({
  fitnessMetrics,
  colorScheme,
}: Readonly<{
  fitnessMetrics: DashboardData['fitnessMetrics'] | undefined;
  colorScheme: 'light' | 'dark';
}>) {
  if (fitnessMetrics?.ctl == null) {
    return (
      <View>
        <ThemedText style={styles.cardDescription}>
          Your CTL, ATL, and TSB metrics will appear here once connected to Intervals.icu.
        </ThemedText>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <ThemedText type="caption">CTL (Fitness)</ThemedText>
            <ThemedText type="defaultSemiBold">--</ThemedText>
          </View>
          <View style={styles.metric}>
            <ThemedText type="caption">ATL (Fatigue)</ThemedText>
            <ThemedText type="defaultSemiBold">--</ThemedText>
          </View>
          <View style={styles.metric}>
            <ThemedText type="caption">TSB (Form)</ThemedText>
            <ThemedText type="defaultSemiBold">--</ThemedText>
          </View>
        </View>
      </View>
    );
  }

  const formStatus = getFormStatus(fitnessMetrics.tsb);

  return (
    <View>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <ThemedText type="caption">CTL (Fitness)</ThemedText>
          <ThemedText type="defaultSemiBold">{formatMetricValue(fitnessMetrics.ctl)}</ThemedText>
        </View>
        <View style={styles.metric}>
          <ThemedText type="caption">ATL (Fatigue)</ThemedText>
          <ThemedText type="defaultSemiBold">{formatMetricValue(fitnessMetrics.atl)}</ThemedText>
        </View>
        <View style={styles.metric}>
          <ThemedText type="caption">TSB (Form)</ThemedText>
          <ThemedText type="defaultSemiBold">{formatMetricValue(fitnessMetrics.tsb)}</ThemedText>
        </View>
      </View>
      {formStatus.label !== '' && (
        <View style={styles.formStatusSection}>
          <View style={styles.formStatusRow}>
            <View
              style={[
                styles.formStatusBadge,
                { backgroundColor: `${Colors[colorScheme][formStatus.color]}20` },
              ]}
            >
              <ThemedText
                style={[styles.formStatusText, { color: Colors[colorScheme][formStatus.color] }]}
              >
                {formStatus.label}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" style={styles.formStatusDescription}>
            {formStatus.description}
          </ThemedText>
          <ThemedText type="caption" style={styles.formStatusHint}>
            TSB = CTL − ATL (fitness minus fatigue)
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function formatActivityDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function ActivityRow({ activity }: Readonly<{ activity: RecentActivity }>) {
  return (
    <View style={styles.activityRow} accessibilityRole="text">
      <View style={styles.activityInfo}>
        <ThemedText numberOfLines={1}>{activity.name}</ThemedText>
        <ThemedText type="caption">{activity.type}</ThemedText>
      </View>
      <View style={styles.activityMeta}>
        <ThemedText type="caption">{formatActivityDuration(activity.duration)}</ThemedText>
        {activity.load != null && (
          <ThemedText type="caption" style={styles.loadBadge}>
            {activity.load} TSS
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function SeasonSetupCard({
  colorScheme,
  onSetup,
  onDismiss,
}: Readonly<{
  colorScheme: 'light' | 'dark';
  onSetup: () => void;
  onDismiss: () => void;
}>) {
  return (
    <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">Set Up Your Season</ThemedText>
      </View>
      <ThemedText style={styles.cardDescription}>
        Welcome to Khepri! Let's set up your {new Date().getFullYear()} season.
      </ThemedText>
      <View style={styles.seasonCtaActions}>
        <Button
          title="Set Up Season"
          onPress={onSetup}
          accessibilityLabel="Set up your training season"
        />
        <Pressable onPress={onDismiss} accessibilityRole="button">
          <ThemedText
            type="caption"
            style={[styles.dismissText, { color: Colors[colorScheme].textSecondary }]}
          >
            or explore the app first
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function EventRow({ event }: Readonly<{ event: UpcomingEvent }>) {
  return (
    <View style={styles.eventRow} accessibilityRole="text">
      <View style={styles.eventInfo}>
        {event.priority != null && (
          <ThemedText type="caption" style={styles.eventPriority}>
            {event.priority}
          </ThemedText>
        )}
        <ThemedText>{event.title}</ThemedText>
      </View>
      <ThemedText type="caption">{formatEventDate(event.date)}</ThemedText>
    </View>
  );
}

function CheckInPrompt() {
  return (
    <View style={styles.checkInPrompt}>
      <ThemedText type="defaultSemiBold">
        Complete your check-in for personalized coaching
      </ThemedText>
      <Button
        title="Start Check-in"
        variant="secondary"
        onPress={() => router.push('/(tabs)/checkin')}
        accessibilityLabel="Start your daily check-in"
      />
    </View>
  );
}

// ============================================================================
// Dashboard Screen
// ============================================================================

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const {
    data: legacyData,
    isLoading: legacyLoading,
    error: legacyError,
    refresh: legacyRefresh,
  } = useDashboard();
  const {
    data: v2Data,
    isLoading: v2Loading,
    error: v2Error,
    refresh: v2Refresh,
  } = useDashboardV2();
  const { info: weekInfo } = useWeekOverview();
  const { accept: acceptAdaptation, reject: rejectAdaptation } = useAdaptations();
  const [refreshing, setRefreshing] = useState(false);
  const [seasonCtaDismissed, setSeasonCtaDismissed] = useState(false);

  const isLoading = legacyLoading || v2Loading;
  const error = legacyError ?? v2Error;

  const hasActiveSeason = v2Data?.season != null;
  const hasActiveBlock = v2Data?.activeBlock != null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([legacyRefresh(), v2Refresh()]);
    setRefreshing(false);
  }, [legacyRefresh, v2Refresh]);

  if (isLoading && !legacyData && !v2Data) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <LoadingState message="Loading your dashboard..." />
      </ScreenContainer>
    );
  }

  if (error && !legacyData && !v2Data) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <ErrorState
          message={error}
          title="Unable to load dashboard"
          action={{ title: 'Retry', onPress: onRefresh }}
        />
      </ScreenContainer>
    );
  }

  // Determine dashboard state
  const showNoSeasonCta = !hasActiveSeason && !seasonCtaDismissed;
  const showPlanBlockCta = hasActiveSeason && !hasActiveBlock;
  const showActiveBlockDashboard = hasActiveSeason && hasActiveBlock;

  // Determine if today is a rest day (no planned workouts and block exists)
  const isRestDay = showActiveBlockDashboard && v2Data != null && v2Data.todayWorkouts.length === 0;

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText type="title" style={styles.greeting}>
          {legacyData?.greeting ?? 'Welcome!'}
        </ThemedText>
        <ThemedText type="caption" style={styles.subtitle}>
          Here's your training overview
        </ThemedText>

        {/* State 1: No season — setup CTA */}
        {showNoSeasonCta && (
          <SeasonSetupCard
            colorScheme={colorScheme}
            onSetup={() => router.push('/season/races' as never)}
            onDismiss={() => setSeasonCtaDismissed(true)}
          />
        )}

        {/* State 2: Season but no block — plan block CTA */}
        {showPlanBlockCta && v2Data?.season != null && (
          <PlanBlockCTA
            seasonName={v2Data.season.name}
            nextRace={v2Data.nextRace}
            onPlanBlock={() => router.push('/plan/block' as never)}
          />
        )}

        {/* State 3: Active block — full dashboard */}
        {showActiveBlockDashboard && v2Data != null && (
          <>
            {/* Adaptation banner above today's workout */}
            <AdaptationBanner
              adaptations={v2Data.pendingAdaptations}
              onAccept={acceptAdaptation}
              onReject={rejectAdaptation}
            />

            {/* Check-in prompt if not done */}
            {!v2Data.checkInDone && <CheckInPrompt />}

            {/* Today's workout */}
            <TodayWorkout workouts={v2Data.todayWorkouts} isRestDay={isRestDay} />

            {/* Upcoming 3 days */}
            <Upcoming workouts={v2Data.upcomingWorkouts} />

            {/* Weekly compliance */}
            {v2Data.weeklyCompliance != null && (
              <WeekSummary compliance={v2Data.weeklyCompliance} />
            )}

            {/* Season progress */}
            {v2Data.activeBlock != null && (
              <SeasonProgress
                block={v2Data.activeBlock}
                blockWeek={v2Data.blockWeek}
                nextRace={v2Data.nextRace}
              />
            )}
          </>
        )}

        {/* This Week Card (existing) */}
        {weekInfo != null && <WeekOverviewCard info={weekInfo} />}

        {/* Today's Workout from check-in (existing, shown when no active block) */}
        {!showActiveBlockDashboard && (
          <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">Today's Workout</ThemedText>
            </View>
            {legacyData?.todayRecommendation ? (
              <View>
                <View style={styles.cardDescription}>
                  <MarkdownText>{legacyData.todayRecommendation.summary}</MarkdownText>
                </View>
                <View style={styles.recommendationDetails}>
                  <ThemedText type="defaultSemiBold">
                    {legacyData.todayRecommendation.workoutSuggestion}
                  </ThemedText>
                  <View style={styles.recommendationMeta}>
                    <ThemedText type="caption">
                      {legacyData.todayRecommendation.intensityLevel} &middot;{' '}
                      {legacyData.todayRecommendation.duration} min
                    </ThemedText>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <ThemedText style={styles.cardDescription}>
                  {legacyData?.hasCompletedCheckinToday
                    ? 'No workout recommendation available yet.'
                    : 'Complete your daily check-in to get a personalized workout recommendation.'}
                </ThemedText>
                {!legacyData?.hasCompletedCheckinToday && (
                  <Button
                    title="Start Check-in"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/checkin')}
                    accessibilityLabel="Start your daily check-in"
                  />
                )}
              </View>
            )}
          </ThemedView>
        )}

        {/* Training Load Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Training Load</ThemedText>
          </View>
          <TrainingLoadContent
            fitnessMetrics={legacyData?.fitnessMetrics}
            colorScheme={colorScheme}
          />
        </ThemedView>

        {/* Recent Activities Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Recent Activities</ThemedText>
          </View>
          {legacyData?.recentActivities && legacyData.recentActivities.length > 0 ? (
            <View style={styles.activitiesList}>
              {legacyData.recentActivities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </View>
          ) : (
            <View
              style={[styles.placeholder, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            >
              <ThemedText type="caption">No recent activities</ThemedText>
            </View>
          )}
        </ThemedView>

        {/* Upcoming Events Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Upcoming Events</ThemedText>
          </View>
          {legacyData?.upcomingEvents && legacyData.upcomingEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {legacyData.upcomingEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </View>
          ) : (
            <View
              style={[styles.placeholder, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            >
              <ThemedText type="caption">No upcoming events</ThemedText>
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  greeting: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
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
    marginBottom: 8,
  },
  cardDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  placeholder: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  metric: {
    alignItems: 'center',
    gap: 4,
  },
  formStatusSection: {
    marginTop: 12,
    gap: 6,
  },
  formStatusRow: {
    alignItems: 'center',
  },
  formStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  formStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formStatusDescription: {
    textAlign: 'center',
  },
  formStatusHint: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 11,
  },
  recommendationDetails: {
    gap: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  activitiesList: {
    gap: 0,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventsList: {
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  eventPriority: {
    fontWeight: '700',
  },
  seasonCtaActions: {
    gap: 12,
    alignItems: 'center',
  },
  dismissText: {
    textAlign: 'center',
    paddingVertical: 4,
  },
  checkInPrompt: {
    gap: 12,
    marginBottom: 16,
  },
});
