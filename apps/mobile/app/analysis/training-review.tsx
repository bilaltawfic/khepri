import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { type TrainingReviewData, useTrainingReview } from '@/hooks';
import { LOOKBACK_DAYS } from '@/hooks/useTrainingReview';
import type { FormStatus, FormTrend, RecoveryAssessment } from '@khepri/core';
import { formatMinutes } from '@khepri/core';

function getFormStatusColor(status: FormStatus, colorScheme: 'light' | 'dark'): string {
  switch (status) {
    case 'race_ready':
      return Colors[colorScheme].success;
    case 'fresh':
      return Colors[colorScheme].zoneEndurance;
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

function getFatigueLevelColor(
  level: RecoveryAssessment['fatigueLevel'],
  colorScheme: 'light' | 'dark'
): string {
  switch (level) {
    case 'low':
      return Colors[colorScheme].success;
    case 'moderate':
      return Colors[colorScheme].info;
    case 'high':
      return Colors[colorScheme].warning;
    case 'very_high':
      return Colors[colorScheme].error;
  }
}

function getFatigueLevelLabel(level: RecoveryAssessment['fatigueLevel']): string {
  switch (level) {
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'very_high':
      return 'Very High';
  }
}

function getTrendArrow(direction: FormTrend['direction']): string {
  switch (direction) {
    case 'improving':
      return '\u2191';
    case 'stable':
      return '\u2192';
    case 'declining':
      return '\u2193';
  }
}

function getTrendColor(direction: FormTrend['direction'], colorScheme: 'light' | 'dark'): string {
  switch (direction) {
    case 'improving':
      return Colors[colorScheme].success;
    case 'stable':
      return Colors[colorScheme].textSecondary;
    case 'declining':
      return Colors[colorScheme].warning;
  }
}

function getTrendLabel(direction: FormTrend['direction']): string {
  switch (direction) {
    case 'improving':
      return 'Form is improving';
    case 'stable':
      return 'Form is stable';
    case 'declining':
      return 'Form is declining';
  }
}

function formatWeekDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CurrentFormCard({
  data,
  colorScheme,
}: {
  readonly data: TrainingReviewData;
  readonly colorScheme: 'light' | 'dark';
}) {
  const statusColor = getFormStatusColor(data.formStatus, colorScheme);
  const trend = data.formTrend;

  return (
    <View
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Current form: ${getFormStatusLabel(data.formStatus)}, TSB ${data.latestTSB.toFixed(1)}`}
    >
      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
        Current Form
      </ThemedText>
      <View style={styles.formRow}>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <ThemedText style={[styles.badgeText, { color: Colors[colorScheme].textInverse }]}>
            {getFormStatusLabel(data.formStatus)}
          </ThemedText>
        </View>
        {trend != null && (
          <ThemedText
            style={[styles.trendArrow, { color: getTrendColor(trend.direction, colorScheme) }]}
            accessibilityLabel={getTrendLabel(trend.direction)}
          >
            {getTrendArrow(trend.direction)}
          </ThemedText>
        )}
      </View>
      <View style={styles.tsbRow}>
        <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
          TSB
        </ThemedText>
        <ThemedText type="defaultSemiBold">{data.latestTSB.toFixed(1)}</ThemedText>
        {trend != null && (
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textTertiary }}>
            {`${trend.tsbChange >= 0 ? '+' : ''}${trend.tsbChange.toFixed(1)} over 7 days`}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function FitnessSummaryCard({
  data,
  colorScheme,
}: {
  readonly data: TrainingReviewData;
  readonly colorScheme: 'light' | 'dark';
}) {
  const tsbColor = getFormStatusColor(data.formStatus, colorScheme);

  return (
    <View
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Fitness: CTL ${data.latestCTL.toFixed(1)}, ATL ${data.latestATL.toFixed(1)}, TSB ${data.latestTSB.toFixed(1)}`}
    >
      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
        Fitness Summary
      </ThemedText>
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].primary }}>
            CTL
          </ThemedText>
          <ThemedText type="defaultSemiBold">{data.latestCTL.toFixed(1)}</ThemedText>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textTertiary }}>
            Fitness
          </ThemedText>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: Colors[colorScheme].divider }]} />
        <View style={styles.metricItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].warning }}>
            ATL
          </ThemedText>
          <ThemedText type="defaultSemiBold">{data.latestATL.toFixed(1)}</ThemedText>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textTertiary }}>
            Fatigue
          </ThemedText>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: Colors[colorScheme].divider }]} />
        <View style={styles.metricItem}>
          <ThemedText type="caption" style={{ color: tsbColor }}>
            TSB
          </ThemedText>
          <ThemedText type="defaultSemiBold">{data.latestTSB.toFixed(1)}</ThemedText>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textTertiary }}>
            Form
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function RecoveryCard({
  recovery,
  colorScheme,
}: {
  readonly recovery: RecoveryAssessment;
  readonly colorScheme: 'light' | 'dark';
}) {
  const fatigueColor = getFatigueLevelColor(recovery.fatigueLevel, colorScheme);

  return (
    <View
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Recovery: fatigue ${getFatigueLevelLabel(recovery.fatigueLevel)}, ${recovery.suggestedRecoveryDays} recovery days suggested`}
    >
      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
        Recovery Assessment
      </ThemedText>
      <View style={styles.recoveryRow}>
        <View style={[styles.badge, { backgroundColor: fatigueColor }]}>
          <ThemedText style={[styles.badgeText, { color: Colors[colorScheme].textInverse }]}>
            {`${getFatigueLevelLabel(recovery.fatigueLevel)} Fatigue`}
          </ThemedText>
        </View>
      </View>
      <View style={styles.recoveryDetails}>
        <View style={styles.recoveryItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
            Recovery Days
          </ThemedText>
          <ThemedText type="defaultSemiBold">{recovery.suggestedRecoveryDays}</ThemedText>
        </View>
        <View style={styles.recoveryItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
            Ramp Rate
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            {`${recovery.rampRate >= 0 ? '+' : ''}${recovery.rampRate.toFixed(1)} CTL/wk`}
          </ThemedText>
        </View>
      </View>
      {recovery.isOverreaching && (
        <View style={[styles.warningBanner, { backgroundColor: Colors[colorScheme].warning }]}>
          <Ionicons name="warning" size={16} color={Colors[colorScheme].textInverse} />
          <ThemedText style={[styles.warningText, { color: Colors[colorScheme].textInverse }]}>
            Overreaching detected - consider extra rest
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function WeeklyLoadsSection({
  data,
  colorScheme,
}: {
  readonly data: TrainingReviewData;
  readonly colorScheme: 'light' | 'dark';
}) {
  const loads = [...data.weeklyLoads].reverse();
  const maxTss = loads.reduce((max, w) => Math.max(max, w.totalTss), 0);

  if (loads.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Weekly training loads, ${loads.length} weeks`}
    >
      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
        Weekly Training Loads
      </ThemedText>
      {loads.map((week) => {
        const barWidth = maxTss > 0 ? (week.totalTss / maxTss) * 100 : 0;
        return (
          <View key={week.weekStart} style={styles.weekRow}>
            <ThemedText
              type="caption"
              style={[styles.weekDate, { color: Colors[colorScheme].textSecondary }]}
            >
              {formatWeekDate(week.weekStart)}
            </ThemedText>
            <View
              style={[
                styles.weekBarContainer,
                { backgroundColor: Colors[colorScheme].surfaceVariant },
              ]}
            >
              <View
                style={[
                  styles.weekBar,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: Colors[colorScheme].primary,
                  },
                ]}
              />
            </View>
            <View style={styles.weekStats}>
              <ThemedText type="caption" style={styles.weekTss}>
                {`${Math.round(week.totalTss)} TSS`}
              </ThemedText>
              <ThemedText type="caption" style={{ color: Colors[colorScheme].textTertiary }}>
                {`${week.activityCount} act \u00b7 ${formatMinutes(Math.round(week.totalDuration))}`}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function FormTrendCard({
  data,
  colorScheme,
}: {
  readonly data: TrainingReviewData;
  readonly colorScheme: 'light' | 'dark';
}) {
  const { formTrend } = data;
  if (formTrend == null) return null;

  const trendColor = getTrendColor(formTrend.direction, colorScheme);

  return (
    <View
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="summary"
      accessibilityLabel={`Form trend: ${getTrendLabel(formTrend.direction)}`}
    >
      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
        Form Trend (7-day)
      </ThemedText>
      <View style={styles.trendHeader}>
        <ThemedText style={[styles.trendDirection, { color: trendColor }]}>
          {`${getTrendArrow(formTrend.direction)} ${formTrend.direction.charAt(0).toUpperCase() + formTrend.direction.slice(1)}`}
        </ThemedText>
      </View>
      <View style={styles.trendDetails}>
        <View style={styles.trendItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
            CTL Change
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            {`${formTrend.ctlChange >= 0 ? '+' : ''}${formTrend.ctlChange.toFixed(1)}`}
          </ThemedText>
        </View>
        <View style={styles.trendItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
            ATL Change
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            {`${formTrend.atlChange >= 0 ? '+' : ''}${formTrend.atlChange.toFixed(1)}`}
          </ThemedText>
        </View>
        <View style={styles.trendItem}>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
            Avg TSB
          </ThemedText>
          <ThemedText type="defaultSemiBold">{formTrend.averageTsb.toFixed(1)}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ colorScheme }: { readonly colorScheme: 'light' | 'dark' }) {
  return (
    <ErrorState
      message="Connect Intervals.icu to see your training analysis. Go to Settings to set up your connection."
      title="No Training Data"
      icon="analytics-outline"
      iconColor={Colors[colorScheme].iconSecondary}
    />
  );
}

export default function TrainingReviewScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, isLoading, error, refresh } = useTrainingReview();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading training data..." />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorState
          message={error}
          action={{
            title: 'Retry',
            onPress: refresh,
            accessibilityLabel: 'Retry loading training data',
          }}
        />
      </ThemedView>
    );
  }

  if (data == null) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState colorScheme={colorScheme} />
      </ThemedView>
    );
  }

  const dateRangeEnd = new Date();
  const dateRangeStart = new Date();
  dateRangeStart.setDate(dateRangeStart.getDate() - LOOKBACK_DAYS);
  const dateRange = `${dateRangeStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${dateRangeEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors[colorScheme].primary}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title">Training Review</ThemedText>
          <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
            {dateRange}
          </ThemedText>
        </View>

        <CurrentFormCard data={data} colorScheme={colorScheme} />
        <FitnessSummaryCard data={data} colorScheme={colorScheme} />
        {data.recovery != null && (
          <RecoveryCard recovery={data.recovery} colorScheme={colorScheme} />
        )}
        <WeeklyLoadsSection data={data} colorScheme={colorScheme} />
        <FormTrendCard data={data} colorScheme={colorScheme} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendArrow: {
    fontSize: 24,
    fontWeight: '700',
  },
  tsbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricDivider: {
    width: 1,
    height: 40,
  },
  recoveryRow: {
    marginBottom: 12,
  },
  recoveryDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  recoveryItem: {
    gap: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekRow: {
    marginBottom: 12,
    gap: 4,
  },
  weekDate: {
    fontSize: 12,
  },
  weekBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weekBar: {
    height: '100%',
    borderRadius: 4,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekTss: {
    fontWeight: '600',
  },
  trendHeader: {
    marginBottom: 12,
  },
  trendDirection: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendItem: {
    gap: 4,
  },
});
