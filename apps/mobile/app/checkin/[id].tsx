import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { MarkdownText } from '@/components/MarkdownText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import type { AIRecommendation } from '@/types/checkin';

type CheckinDetail = {
  readonly id: string;
  readonly checkinDate: string;
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

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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

function getWellnessScore(detail: CheckinDetail): number | null {
  const { sleepQuality, energyLevel, stressLevel, overallSoreness } = detail;
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

type IntensityBadgeProps = {
  readonly intensity: string;
  readonly colorScheme: 'light' | 'dark';
};

function IntensityBadge({ intensity, colorScheme }: IntensityBadgeProps) {
  const color = getIntensityColor(intensity, colorScheme);
  const label = intensity.charAt(0).toUpperCase() + intensity.slice(1);

  return (
    <View style={[styles.intensityBadge, { backgroundColor: color }]}>
      <ThemedText style={styles.intensityText}>{label}</ThemedText>
    </View>
  );
}

type MetricCardProps = {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly value: string;
  readonly colorScheme: 'light' | 'dark';
};

function MetricCard({ icon, label, value, colorScheme }: MetricCardProps) {
  return (
    <View style={[styles.metricCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
      <Ionicons name={icon} size={20} color={Colors[colorScheme].iconSecondary} />
      <ThemedText type="defaultSemiBold" style={styles.metricCardValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption">{label}</ThemedText>
    </View>
  );
}

export default function CheckinDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<CheckinDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckin() {
      if (!supabase || !id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          setError('Could not load check-in');
          return;
        }

        if (!data) {
          setError('Check-in not found');
          return;
        }

        setDetail({
          id: data.id,
          checkinDate: data.checkin_date,
          sleepQuality: data.sleep_quality,
          sleepHours: data.sleep_hours,
          energyLevel: data.energy_level,
          stressLevel: data.stress_level,
          overallSoreness: data.overall_soreness,
          availableTimeMinutes: data.available_time_minutes,
          recommendation: isValidRecommendation(data.ai_recommendation)
            ? data.ai_recommendation
            : null,
        });
      } catch {
        setError('Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchCheckin();
  }, [id]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        </View>
      </ThemedView>
    );
  }

  if (error || !detail) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText type="subtitle" style={styles.errorTitle}>
            {error ?? 'Check-in not found'}
          </ThemedText>
          <Pressable
            style={[styles.backButton, { backgroundColor: Colors[colorScheme].primary }]}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ThemedText style={[styles.backButtonText, { color: Colors[colorScheme].textInverse }]}>
              Go Back
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const wellnessScore = getWellnessScore(detail);
  const rec = detail.recommendation;

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Date header */}
        <View style={styles.dateHeader}>
          <ThemedText type="title">{formatDate(detail.checkinDate)}</ThemedText>
          {wellnessScore != null && (
            <View
              style={[
                styles.wellnessBadge,
                { backgroundColor: Colors[colorScheme].surfaceVariant },
              ]}
            >
              <ThemedText type="caption">Wellness</ThemedText>
              <ThemedText type="title" style={styles.wellnessValue}>
                {wellnessScore}%
              </ThemedText>
            </View>
          )}
        </View>

        {/* Wellness metrics */}
        <View style={styles.metricsGrid}>
          {detail.sleepQuality != null && (
            <MetricCard
              icon="moon"
              label="Sleep Quality"
              value={`${detail.sleepQuality}/10`}
              colorScheme={colorScheme}
            />
          )}
          {detail.sleepHours != null && (
            <MetricCard
              icon="time"
              label="Sleep Hours"
              value={`${detail.sleepHours}h`}
              colorScheme={colorScheme}
            />
          )}
          {detail.energyLevel != null && (
            <MetricCard
              icon="flash"
              label="Energy"
              value={`${detail.energyLevel}/10`}
              colorScheme={colorScheme}
            />
          )}
          {detail.stressLevel != null && (
            <MetricCard
              icon="pulse"
              label="Stress"
              value={`${detail.stressLevel}/10`}
              colorScheme={colorScheme}
            />
          )}
          {detail.overallSoreness != null && (
            <MetricCard
              icon="body"
              label="Soreness"
              value={`${detail.overallSoreness}/10`}
              colorScheme={colorScheme}
            />
          )}
          {detail.availableTimeMinutes != null && (
            <MetricCard
              icon="hourglass"
              label="Available Time"
              value={`${detail.availableTimeMinutes} min`}
              colorScheme={colorScheme}
            />
          )}
        </View>

        {/* Recommendation */}
        {rec != null && (
          <ThemedView
            style={[styles.recommendationCard, { backgroundColor: Colors[colorScheme].surface }]}
          >
            <View style={styles.recommendationHeader}>
              <Ionicons name="bulb" size={24} color={Colors[colorScheme].secondary} />
              <ThemedText type="subtitle">Recommendation</ThemedText>
            </View>

            {rec.isLocalFallback === true && (
              <ThemedText type="caption" style={styles.fallbackNotice}>
                AI coach unavailable — using simplified recommendation
              </ThemedText>
            )}

            <View style={styles.recommendationSummary}>
              <MarkdownText>{rec.summary}</MarkdownText>
            </View>

            <View
              style={[styles.workoutBox, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            >
              <View style={styles.workoutHeader}>
                <IntensityBadge intensity={rec.intensityLevel} colorScheme={colorScheme} />
                <ThemedText type="caption">{rec.duration} min</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.workoutTitle}>
                {rec.workoutSuggestion}
              </ThemedText>
              {rec.notes != null && rec.notes.length > 0 && (
                <ThemedText type="caption" style={styles.workoutNotes}>
                  {rec.notes}
                </ThemedText>
              )}
            </View>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  wellnessBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  wellnessValue: {
    fontSize: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  metricCardValue: {
    fontSize: 18,
  },
  recommendationCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fallbackNotice: {
    color: '#b08000',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  recommendationSummary: {
    marginBottom: 16,
    lineHeight: 24,
  },
  workoutBox: {
    padding: 16,
    borderRadius: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 18,
  },
  workoutNotes: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  intensityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
