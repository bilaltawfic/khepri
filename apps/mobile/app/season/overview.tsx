import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import {
  type SeasonSkeletonInput,
  type SeasonSkeletonPhaseInput,
  useAuth,
  useSeasonSetup,
} from '@/contexts';
import { supabase } from '@/lib/supabase';
import { createSeason, getAthleteByAuthUser } from '@khepri/supabase-client';
import { seasonFormStyles } from './shared-styles';

// =============================================================================
// PHASE COLORS
// =============================================================================

const PHASE_COLORS: Record<string, string> = {
  base: '#4caf50',
  build: '#ff9800',
  peak: '#f44336',
  taper: '#9c27b0',
  recovery: '#2196f3',
  race_week: '#e91e63',
  off_season: '#607d8b',
};

function getPhaseColor(type: string): string {
  return PHASE_COLORS[type] ?? '#607d8b';
}

// =============================================================================
// TIMELINE PHASE
// =============================================================================

type PhaseCardProps = Readonly<{
  phase: SeasonSkeletonPhaseInput;
  colorScheme: 'light' | 'dark';
}>;

function PhaseCard({ phase, colorScheme }: PhaseCardProps) {
  const phaseColor = getPhaseColor(phase.type);

  return (
    <View style={[styles.phaseCard, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={[styles.phaseIndicator, { backgroundColor: phaseColor }]} />
      <View style={styles.phaseContent}>
        <View style={styles.phaseHeader}>
          <ThemedText type="defaultSemiBold">{phase.name}</ThemedText>
          <ThemedText type="caption">
            {phase.weeks}w @ {phase.targetHoursPerWeek}h/wk
          </ThemedText>
        </View>
        <ThemedText type="caption" style={styles.phaseDates}>
          {formatDateRange(phase.startDate, phase.endDate)}
        </ThemedText>
        <ThemedText type="caption" style={styles.phaseFocus}>
          {phase.focus}
        </ThemedText>
      </View>
    </View>
  );
}

// =============================================================================
// FEASIBILITY NOTES
// =============================================================================

type FeasibilityNotesProps = Readonly<{
  notes: readonly string[];
  colorScheme: 'light' | 'dark';
}>;

function FeasibilityNotes({ notes, colorScheme }: FeasibilityNotesProps) {
  if (notes.length === 0) return null;

  return (
    <View style={[styles.notesSection, { backgroundColor: `${Colors[colorScheme].warning}20` }]}>
      <View style={styles.notesHeader}>
        <Ionicons name="alert-circle" size={20} color={Colors[colorScheme].warning} />
        <ThemedText type="defaultSemiBold" style={styles.notesTitle}>
          Notes
        </ThemedText>
      </View>
      {notes.map((note, index) => (
        <ThemedText
          key={`note-${index}-${note.slice(0, 20)}`}
          type="caption"
          style={styles.noteItem}
        >
          {note}
        </ThemedText>
      ))}
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function OverviewScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const { data, setSkeleton, reset } = useSeasonSetup();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSkeleton = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke('generate-season-skeleton', {
        body: {
          races: data.races,
          goals: data.goals,
          preferences: {
            weeklyHoursMin: data.preferences.weeklyHoursMin,
            weeklyHoursMax: data.preferences.weeklyHoursMax,
            trainingDays: data.preferences.trainingDays,
            sportPriority: data.preferences.sportPriority,
          },
          currentDate: new Date().toISOString().slice(0, 10),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const skeleton = response.data as SeasonSkeletonInput;
      setSkeleton(skeleton);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate season plan';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [data.races, data.goals, data.preferences, setSkeleton]);

  useEffect(() => {
    if (data.skeleton == null) {
      generateSkeleton();
    }
  }, [data.skeleton, generateSkeleton]);

  const handleApprove = async () => {
    if (!supabase) {
      setError('Supabase is not configured');
      return;
    }
    if (!user?.id) {
      setError('You must be signed in to create a season');
      return;
    }
    if (data.skeleton == null) return;

    setIsSaving(true);
    setError(null);
    try {
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);
      if (athleteResult.error || !athleteResult.data) {
        throw new Error('Could not find athlete profile');
      }

      const currentYear = new Date().getFullYear();
      const seasonResult = await createSeason(supabase, {
        athlete_id: athleteResult.data.id,
        name: `${currentYear} Season`,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: `${currentYear}-12-31`,
        status: 'active',
        preferences: {
          weeklyHoursTarget: data.preferences.weeklyHoursMax,
          availableDays: [...data.preferences.trainingDays],
          sportPriority: [...data.preferences.sportPriority],
          maxSessionsPerDay: 2,
          preferredRestDays: getRestDays(data.preferences.trainingDays),
        },
        skeleton: {
          phases: data.skeleton.phases.map((p) => ({
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
            focus: p.focus,
            weeklyHours: p.targetHoursPerWeek,
          })),
          generatedAt: new Date().toISOString(),
        },
      });

      if (seasonResult.error) {
        throw new Error(seasonResult.error.message);
      }

      reset();
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save season';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isGenerating) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        <ThemedText type="subtitle" style={styles.loadingTitle}>
          Building your season
        </ThemedText>
        <ThemedText style={styles.loadingSubtitle}>
          Analyzing your races, goals, and preferences to create an optimal training plan. This
          usually takes 1–2 minutes.
        </ThemedText>
      </ThemedView>
    );
  }

  // Error state
  if (error != null && data.skeleton == null) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ErrorState message={error} action={{ title: 'Try Again', onPress: generateSkeleton }} />
      </ThemedView>
    );
  }

  const skeleton = data.skeleton;
  if (skeleton == null) return null;

  return (
    <ThemedView style={seasonFormStyles.container}>
      <ScrollView
        style={seasonFormStyles.scrollView}
        contentContainerStyle={seasonFormStyles.scrollContent}
      >
        <View style={seasonFormStyles.header}>
          <ThemedText type="subtitle" style={seasonFormStyles.title}>
            Your season plan
          </ThemedText>
          <ThemedText style={seasonFormStyles.description}>
            {skeleton.totalWeeks} weeks across {skeleton.phases.length} training phases. Review and
            approve to get started.
          </ThemedText>
        </View>

        {/* Feasibility notes */}
        <FeasibilityNotes notes={skeleton.feasibilityNotes} colorScheme={colorScheme} />

        {/* Phase legend */}
        <View style={styles.legend}>
          {Object.entries(PHASE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <ThemedText type="caption">{type.replace('_', ' ')}</ThemedText>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {skeleton.phases.map((phase, index) => (
            <PhaseCard key={`${phase.name}-${index}`} phase={phase} colorScheme={colorScheme} />
          ))}
        </View>

        {error != null && (
          <ThemedText
            type="caption"
            style={[
              seasonFormStyles.errorText,
              { color: Colors[colorScheme].error, marginBottom: 16 },
            ]}
            accessibilityRole="alert"
          >
            {error}
          </ThemedText>
        )}
      </ScrollView>

      <View style={seasonFormStyles.actions}>
        <Button
          title={isSaving ? 'Saving...' : 'Approve & Create Season'}
          onPress={handleApprove}
          disabled={isSaving}
          accessibilityLabel={isSaving ? 'Saving season' : 'Approve and create season'}
        />
      </View>
    </ThemedView>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString(undefined, opts)} — ${endDate.toLocaleDateString(undefined, opts)}`;
}

function getRestDays(trainingDays: readonly number[]): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !trainingDays.includes(d));
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingTitle: {
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeline: {
    gap: 8,
    marginBottom: 24,
  },
  phaseCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  phaseIndicator: {
    width: 6,
  },
  phaseContent: {
    flex: 1,
    padding: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  phaseDates: {
    opacity: 0.7,
    marginBottom: 2,
  },
  phaseFocus: {
    fontStyle: 'italic',
  },
  notesSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notesTitle: {
    flex: 1,
  },
  noteItem: {
    marginLeft: 28,
    marginBottom: 4,
    lineHeight: 20,
  },
});
