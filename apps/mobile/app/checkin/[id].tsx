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
import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import type { AIRecommendation } from '@/types/checkin';
import {
  formatCheckinDate,
  getIntensityColor,
  getWellnessScore,
  isValidRecommendation,
} from '@/utils/checkin';
import { recommendationStyles } from '@/utils/recommendation-styles';
import { getAthleteByAuthUser } from '@khepri/supabase-client';

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

type IntensityBadgeProps = {
  readonly intensity: string;
  readonly colorScheme: 'light' | 'dark';
};

function IntensityBadge({ intensity, colorScheme }: IntensityBadgeProps) {
  const color = getIntensityColor(intensity, colorScheme);
  const label = intensity.charAt(0).toUpperCase() + intensity.slice(1);

  return (
    <View style={[recommendationStyles.intensityBadge, { backgroundColor: color }]}>
      <ThemedText style={recommendationStyles.intensityText}>{label}</ThemedText>
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
  const { user } = useAuth();
  const [detail, setDetail] = useState<CheckinDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckin() {
      if (!id) {
        setIsLoading(false);
        router.back();
        return;
      }

      if (!supabase) {
        setError('Supabase client is not configured');
        setIsLoading(false);
        return;
      }

      if (!user?.id) {
        setError('You must be signed in to view this check-in');
        setIsLoading(false);
        return;
      }

      try {
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);
        if (athleteResult.error || !athleteResult.data) {
          setError('Could not load athlete profile');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('daily_checkins')
          .select(
            'id, checkin_date, sleep_quality, sleep_hours, energy_level, stress_level, overall_soreness, available_time_minutes, ai_recommendation'
          )
          .eq('id', id)
          .eq('athlete_id', athleteResult.data.id)
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
  }, [id, user?.id]);

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
          <ThemedText type="title">
            {formatCheckinDate(detail.checkinDate, { long: true })}
          </ThemedText>
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
            style={[recommendationStyles.card, { backgroundColor: Colors[colorScheme].surface }]}
          >
            <View style={recommendationStyles.header}>
              <Ionicons name="bulb" size={24} color={Colors[colorScheme].secondary} />
              <ThemedText type="subtitle">Recommendation</ThemedText>
            </View>

            {rec.isLocalFallback === true && (
              <ThemedText type="caption" style={recommendationStyles.fallbackNotice}>
                AI coach unavailable — using simplified recommendation
              </ThemedText>
            )}

            <View style={recommendationStyles.summary}>
              <MarkdownText>{rec.summary}</MarkdownText>
            </View>

            <View
              style={[
                recommendationStyles.workoutBox,
                { backgroundColor: Colors[colorScheme].surfaceVariant },
              ]}
            >
              <View style={recommendationStyles.workoutHeader}>
                <IntensityBadge intensity={rec.intensityLevel} colorScheme={colorScheme} />
                <ThemedText type="caption">{rec.duration} min</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={recommendationStyles.workoutTitle}>
                {rec.workoutSuggestion}
              </ThemedText>
              {rec.notes != null && rec.notes.length > 0 && (
                <ThemedText type="caption" style={recommendationStyles.workoutNotes}>
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
});
