import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { type FormStatus, parseDateOnly } from '@khepri/core';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { type RaceCountdownItem, useRaceCountdown } from '@/hooks';

function getFormStatusColor(status: FormStatus, colorScheme: 'light' | 'dark'): string {
  switch (status) {
    case 'race_ready':
      return Colors[colorScheme].success;
    case 'fresh':
      return Colors[colorScheme].info;
    case 'optimal':
      return Colors[colorScheme].primary;
    case 'tired':
      return Colors[colorScheme].warning;
    case 'overtrained':
      return Colors[colorScheme].error;
  }
}

function getFormStatusLabel(status: FormStatus): string {
  switch (status) {
    case 'race_ready':
      return 'Race Ready';
    case 'fresh':
      return 'Fresh';
    case 'optimal':
      return 'Optimal';
    case 'tired':
      return 'Tired';
    case 'overtrained':
      return 'Overtrained';
  }
}

function getConfidenceIcon(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'checkmark-circle';
    case 'medium':
      return 'remove-circle';
    case 'low':
      return 'help-circle';
  }
}

function formatRaceDate(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function RaceCard({
  item,
  colorScheme,
}: Readonly<{ item: RaceCountdownItem; colorScheme: 'light' | 'dark' }>) {
  const { goal, readiness } = item;
  const raceName = goal.race_event_name ?? goal.title;

  const accessibilityParts = [raceName];
  if (readiness != null) {
    accessibilityParts.push(`${readiness.daysUntilRace} days remaining`);
    accessibilityParts.push(`Form: ${getFormStatusLabel(readiness.currentForm)}`);
    accessibilityParts.push(`Confidence: ${readiness.confidence}`);
  }

  return (
    <ThemedView
      style={[styles.raceCard, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityParts.join(', ')}
    >
      <View style={styles.cardHeader}>
        <Ionicons
          name="trophy"
          size={22}
          color={Colors[colorScheme].secondary}
          style={styles.trophyIcon}
        />
        <View style={styles.cardHeaderText}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {raceName}
          </ThemedText>
          {goal.target_date != null && (
            <ThemedText type="caption">{formatRaceDate(goal.target_date)}</ThemedText>
          )}
        </View>
        {readiness != null && (
          <View style={[styles.daysBadge, { backgroundColor: Colors[colorScheme].primaryLight }]}>
            <ThemedText style={[styles.daysNumber, { color: Colors[colorScheme].textInverse }]}>
              {readiness.daysUntilRace}
            </ThemedText>
            <ThemedText style={[styles.daysLabel, { color: Colors[colorScheme].textInverse }]}>
              days
            </ThemedText>
          </View>
        )}
      </View>

      {goal.race_location != null && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={Colors[colorScheme].icon} />
          <ThemedText type="caption" style={styles.metaText}>
            {goal.race_location}
          </ThemedText>
        </View>
      )}
      {goal.race_distance != null && (
        <View style={styles.metaRow}>
          <Ionicons name="speedometer-outline" size={14} color={Colors[colorScheme].icon} />
          <ThemedText type="caption" style={styles.metaText}>
            {goal.race_distance}
          </ThemedText>
        </View>
      )}

      {readiness != null ? (
        <View style={styles.readinessSection}>
          <View style={styles.readinessRow}>
            <View
              style={[
                styles.formBadge,
                { backgroundColor: getFormStatusColor(readiness.currentForm, colorScheme) },
              ]}
            >
              <ThemedText style={styles.formBadgeText}>
                {getFormStatusLabel(readiness.currentForm)}
              </ThemedText>
            </View>
            <View style={styles.readinessDetail}>
              <ThemedText type="caption">
                Projected TSB: {Math.round(readiness.projectedTsb)}
              </ThemedText>
            </View>
            <View style={styles.confidenceRow}>
              <Ionicons
                name={
                  getConfidenceIcon(readiness.confidence) as React.ComponentProps<
                    typeof Ionicons
                  >['name']
                }
                size={16}
                color={Colors[colorScheme].icon}
              />
              <ThemedText type="caption" style={styles.confidenceText}>
                {readiness.confidence}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="caption" style={styles.recommendation}>
            {readiness.recommendation}
          </ThemedText>
        </View>
      ) : (
        <View
          style={[styles.noDataBanner, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        >
          <Ionicons name="analytics-outline" size={16} color={Colors[colorScheme].iconSecondary} />
          <ThemedText type="caption" style={styles.noDataText}>
            Connect to Intervals.icu for race predictions
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

export default function RaceCountdownScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { races, isLoading, error, refresh } = useRaceCountdown();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (isLoading && races.length === 0) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading race countdown..." />
      </ScreenContainer>
    );
  }

  if (error && races.length === 0) {
    return (
      <ScreenContainer>
        <ErrorState
          message={error}
          title="Unable to load races"
          action={{ title: 'Retry', onPress: refresh }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ThemedText type="title" style={styles.screenTitle}>
        Race Countdown
      </ThemedText>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {races.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="No Upcoming Races"
            message="Add a race goal to see your countdown and readiness predictions."
          />
        ) : (
          races.map((item) => <RaceCard key={item.goal.id} item={item} colorScheme={colorScheme} />)
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  raceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trophyIcon: {
    marginRight: 10,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  daysBadge: {
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 48,
  },
  daysNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  daysLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    flex: 1,
  },
  readinessSection: {
    marginTop: 8,
    gap: 6,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  formBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  formBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  readinessDetail: {
    flex: 1,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    textTransform: 'capitalize',
  },
  recommendation: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  noDataBanner: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  noDataText: {
    flex: 1,
  },
});
