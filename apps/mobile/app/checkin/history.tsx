import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import type { AIRecommendation } from '@/types/checkin';
import { getAthleteByAuthUser, getRecentCheckins } from '@khepri/supabase-client';

type CheckinHistoryItem = {
  readonly id: string;
  readonly date: string;
  readonly sleepQuality: number | null;
  readonly sleepHours: number | null;
  readonly energyLevel: number | null;
  readonly stressLevel: number | null;
  readonly overallSoreness: number | null;
  readonly availableTimeMinutes: number | null;
  readonly recommendation: AIRecommendation | null;
};

function isValidRecommendation(value: unknown): value is AIRecommendation {
  if (value == null || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.summary === 'string' &&
    typeof rec.workoutSuggestion === 'string' &&
    typeof rec.intensityLevel === 'string' &&
    typeof rec.duration === 'number'
  );
}

function mapCheckinRow(row: {
  readonly id: string;
  readonly checkin_date: string;
  readonly sleep_quality: number | null;
  readonly sleep_hours: number | null;
  readonly energy_level: number | null;
  readonly stress_level: number | null;
  readonly overall_soreness: number | null;
  readonly available_time_minutes: number | null;
  readonly ai_recommendation: unknown;
}): CheckinHistoryItem {
  return {
    id: row.id,
    date: row.checkin_date,
    sleepQuality: row.sleep_quality,
    sleepHours: row.sleep_hours,
    energyLevel: row.energy_level,
    stressLevel: row.stress_level,
    overallSoreness: row.overall_soreness,
    availableTimeMinutes: row.available_time_minutes,
    recommendation: isValidRecommendation(row.ai_recommendation) ? row.ai_recommendation : null,
  };
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getIntensityColor(intensity: string, colorScheme: 'light' | 'dark'): string {
  switch (intensity) {
    case 'recovery':
      return Colors[colorScheme].zoneRecovery;
    case 'easy':
      return Colors[colorScheme].zoneEndurance;
    case 'moderate':
      return Colors[colorScheme].zoneTempo;
    case 'hard':
      return Colors[colorScheme].zoneThreshold;
    default:
      return Colors[colorScheme].textTertiary;
  }
}

function getWellnessScore(item: CheckinHistoryItem): number | null {
  const { sleepQuality, energyLevel, stressLevel, overallSoreness } = item;
  if (
    sleepQuality == null ||
    energyLevel == null ||
    stressLevel == null ||
    overallSoreness == null
  ) {
    return null;
  }
  const sleepScore = sleepQuality / 10;
  const energyScore = energyLevel / 10;
  const stressScore = 1 - stressLevel / 10;
  const sorenessScore = 1 - overallSoreness / 10;
  return Math.round(((sleepScore + energyScore + stressScore + sorenessScore) / 4) * 100);
}

type HistoryItemProps = {
  readonly item: CheckinHistoryItem;
  readonly colorScheme: 'light' | 'dark';
  readonly onPress: () => void;
};

function HistoryItem({ item, colorScheme, onPress }: HistoryItemProps) {
  const wellnessScore = getWellnessScore(item);
  const intensity = item.recommendation?.intensityLevel;
  const intensityColor = intensity == null ? null : getIntensityColor(intensity, colorScheme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Check-in from ${formatDate(item.date)}`}
    >
      <ThemedView style={[styles.historyItem, { backgroundColor: Colors[colorScheme].surface }]}>
        <View style={styles.historyHeader}>
          <View style={styles.dateContainer}>
            <ThemedText type="defaultSemiBold">{formatDate(item.date)}</ThemedText>
            {intensityColor != null && (
              <View style={[styles.intensityDot, { backgroundColor: intensityColor }]} />
            )}
          </View>
          {wellnessScore != null && (
            <View
              style={[
                styles.wellnessScore,
                { backgroundColor: Colors[colorScheme].surfaceVariant },
              ]}
            >
              <ThemedText type="caption" style={styles.wellnessLabel}>
                Wellness
              </ThemedText>
              <ThemedText type="defaultSemiBold">{wellnessScore}%</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.metricsRow}>
          {item.sleepQuality != null && (
            <MetricBadge
              icon="moon"
              value={item.sleepHours == null ? `${item.sleepQuality}` : `${item.sleepHours}h`}
              sublabel={item.sleepHours == null ? 'Sleep' : `Q: ${item.sleepQuality}`}
              colorScheme={colorScheme}
            />
          )}
          {item.energyLevel != null && (
            <MetricBadge
              icon="flash"
              value={item.energyLevel.toString()}
              sublabel="Energy"
              colorScheme={colorScheme}
            />
          )}
          {item.stressLevel != null && (
            <MetricBadge
              icon="pulse"
              value={item.stressLevel.toString()}
              sublabel="Stress"
              colorScheme={colorScheme}
            />
          )}
          {item.overallSoreness != null && (
            <MetricBadge
              icon="body"
              value={item.overallSoreness.toString()}
              sublabel="Soreness"
              colorScheme={colorScheme}
            />
          )}
        </View>

        {item.recommendation != null && (
          <View
            style={[
              styles.recommendationBox,
              { borderLeftColor: intensityColor ?? Colors[colorScheme].textTertiary },
            ]}
          >
            <ThemedText type="caption" style={styles.recommendationText}>
              {item.recommendation.workoutSuggestion}
              {item.recommendation.duration > 0 ? ` · ${item.recommendation.duration} min` : ''}
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

type MetricBadgeProps = {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly value: string;
  readonly sublabel: string;
  readonly colorScheme: 'light' | 'dark';
};

function MetricBadge({ icon, value, sublabel, colorScheme }: MetricBadgeProps) {
  return (
    <View style={[styles.metricBadge, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
      <Ionicons name={icon} size={14} color={Colors[colorScheme].iconSecondary} />
      <ThemedText type="defaultSemiBold" style={styles.metricValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={styles.metricLabel}>
        {sublabel}
      </ThemedText>
    </View>
  );
}

export default function CheckinHistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const [history, setHistory] = useState<CheckinHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (showRefresh = false) => {
      if (!supabase || !user?.id) return;

      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);
        if (athleteResult.error || !athleteResult.data) {
          setError('Could not load athlete profile');
          return;
        }

        const result = await getRecentCheckins(supabase, athleteResult.data.id, 30);
        if (result.error) {
          setError('Could not load check-in history');
          return;
        }

        setHistory((result.data ?? []).map(mapCheckinRow));
      } catch {
        setError('Something went wrong');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const handleItemPress = (item: CheckinHistoryItem) => {
    router.push(`/checkin/${item.id}`);
  };

  const renderItem = ({ item }: { item: CheckinHistoryItem }) => (
    <HistoryItem item={item} colorScheme={colorScheme} onPress={() => handleItemPress(item)} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name="calendar-outline" size={48} color={Colors[colorScheme].iconSecondary} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        No check-ins yet
      </ThemedText>
      <ThemedText type="caption" style={styles.emptyText}>
        Complete your first daily check-in to start tracking your wellness and training.
      </ThemedText>
      <Pressable
        style={[styles.emptyButton, { backgroundColor: Colors[colorScheme].primary }]}
        onPress={() => router.back()}
        accessibilityLabel="Start first check-in"
        accessibilityRole="button"
      >
        <ThemedText style={[styles.emptyButtonText, { color: Colors[colorScheme].textInverse }]}>
          Start Check-in
        </ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: Colors[colorScheme].primary }]}
            onPress={() => void fetchHistory()}
            accessibilityLabel="Retry loading history"
            accessibilityRole="button"
          >
            <ThemedText
              style={[styles.emptyButtonText, { color: Colors[colorScheme].textInverse }]}
            >
              Retry
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void fetchHistory(true)}
            tintColor={Colors[colorScheme].primary}
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wellnessScore: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  wellnessLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 2,
  },
  metricValue: {
    fontSize: 14,
  },
  metricLabel: {
    fontSize: 10,
  },
  recommendationBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  recommendationText: {
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
