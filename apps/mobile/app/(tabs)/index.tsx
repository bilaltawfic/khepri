import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { parseDateOnly } from '@khepri/core';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { type DashboardData, type RecentActivity, type UpcomingEvent, useDashboard } from '@/hooks';

function formatEventDate(dateStr: string): string {
  const date = parseDateOnly(dateStr);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMetricValue(value: number | null): string {
  return value == null ? '--' : String(value);
}

function TrainingLoadContent({
  fitnessMetrics,
}: Readonly<{
  fitnessMetrics: DashboardData['fitnessMetrics'] | undefined;
}>) {
  if (fitnessMetrics?.ftp == null) {
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

  return (
    <View style={styles.metricsRow}>
      <View style={styles.metric}>
        <ThemedText type="caption">FTP</ThemedText>
        <ThemedText type="defaultSemiBold">{`${fitnessMetrics.ftp}W`}</ThemedText>
      </View>
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

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, isLoading, error, refresh } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (isLoading && !data) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading your dashboard..." />
      </ScreenContainer>
    );
  }

  if (error && !data) {
    return (
      <ScreenContainer>
        <ErrorState
          message={error}
          title="Unable to load dashboard"
          action={{ title: 'Retry', onPress: refresh }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText type="title" style={styles.greeting}>
          {data?.greeting ?? 'Welcome!'}
        </ThemedText>
        <ThemedText type="caption" style={styles.subtitle}>
          Here's your training overview
        </ThemedText>

        {/* Today's Workout Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Today's Workout</ThemedText>
          </View>
          {data?.todayRecommendation ? (
            <View>
              <ThemedText style={styles.cardDescription}>
                {data.todayRecommendation.summary}
              </ThemedText>
              <View style={styles.recommendationDetails}>
                <ThemedText type="defaultSemiBold">
                  {data.todayRecommendation.workoutSuggestion}
                </ThemedText>
                <View style={styles.recommendationMeta}>
                  <ThemedText type="caption">
                    {data.todayRecommendation.intensityLevel} · {data.todayRecommendation.duration}{' '}
                    min
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <ThemedText style={styles.cardDescription}>
                {data?.hasCompletedCheckinToday
                  ? 'No workout recommendation available yet.'
                  : 'Complete your daily check-in to get a personalized workout recommendation.'}
              </ThemedText>
              {!data?.hasCompletedCheckinToday && (
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

        {/* Training Load Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Training Load</ThemedText>
          </View>
          <TrainingLoadContent fitnessMetrics={data?.fitnessMetrics} />
        </ThemedView>

        {/* Recent Activities Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Recent Activities</ThemedText>
          </View>
          {data?.recentActivities && data.recentActivities.length > 0 ? (
            <View style={styles.activitiesList}>
              {data.recentActivities.map((activity) => (
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
          {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {data.upcomingEvents.map((event) => (
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
});
