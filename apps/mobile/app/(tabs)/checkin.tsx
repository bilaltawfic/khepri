import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  ConstraintToggles,
  HoursInput,
  ScaleInput,
  SorenessInput,
  TimeAvailableInput,
} from '@/components/wellness';
import { Colors } from '@/constants/Colors';
import { useCheckin } from '@/hooks/useCheckin';

export default function CheckinScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const {
    formData,
    submissionState,
    submissionError,
    recommendation,
    setSleepQuality,
    setSleepHours,
    setEnergyLevel,
    setStressLevel,
    setOverallSoreness,
    toggleSorenessArea,
    setAvailableTime,
    setConstraints,
    submitCheckin,
    resetForm,
    isFormValid,
    missingFields,
  } = useCheckin();

  // Show analyzing state
  if (submissionState === 'submitting' || submissionState === 'analyzing') {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
          <ThemedText type="subtitle" style={styles.loadingTitle}>
            {submissionState === 'submitting' ? 'Submitting...' : 'Analyzing...'}
          </ThemedText>
          <ThemedText type="caption" style={styles.loadingSubtitle}>
            {submissionState === 'analyzing'
              ? 'Khepri is analyzing your wellness data and training history'
              : 'Saving your check-in data'}
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  // Show recommendation
  if (submissionState === 'success' && recommendation) {
    return (
      <ScreenContainer>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.successHeader}>
            <View
              style={[styles.successIcon, { backgroundColor: `${Colors[colorScheme].success}20` }]}
            >
              <Ionicons name="checkmark-circle" size={48} color={Colors[colorScheme].success} />
            </View>
            <ThemedText type="title" style={styles.successTitle}>
              Check-in Complete!
            </ThemedText>
          </View>

          <ThemedView
            style={[styles.recommendationCard, { backgroundColor: Colors[colorScheme].surface }]}
          >
            <View style={styles.recommendationHeader}>
              <Ionicons name="bulb" size={24} color={Colors[colorScheme].secondary} />
              <ThemedText type="subtitle">Today's Recommendation</ThemedText>
            </View>

            <ThemedText style={styles.recommendationSummary}>{recommendation.summary}</ThemedText>

            <View
              style={[styles.workoutBox, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            >
              <View style={styles.workoutHeader}>
                <IntensityBadge
                  intensity={recommendation.intensityLevel}
                  colorScheme={colorScheme}
                />
                <ThemedText type="caption">{recommendation.duration} min</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.workoutTitle}>
                {recommendation.workoutSuggestion}
              </ThemedText>
              {recommendation.notes && (
                <ThemedText type="caption" style={styles.workoutNotes}>
                  {recommendation.notes}
                </ThemedText>
              )}
            </View>
          </ThemedView>

          <View style={styles.actionButtons}>
            <Button
              title="Start Workout"
              onPress={() => {
                // TODO: Navigate to workout screen
              }}
              accessibilityLabel="Start recommended workout"
            />
            <Button
              title="Chat with Coach"
              variant="secondary"
              onPress={() => {
                router.push('/(tabs)/chat');
              }}
              accessibilityLabel="Open chat with AI coach"
            />
            <Button
              title="View History"
              variant="text"
              onPress={() => {
                router.push('/checkin/history');
              }}
              accessibilityLabel="View check-in history"
            />
          </View>

          <Pressable style={styles.resetLink} onPress={resetForm}>
            <ThemedText type="caption" style={{ color: Colors[colorScheme].textTertiary }}>
              Submit another check-in
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Show form
  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Daily Check-in
          </ThemedText>
          <ThemedText type="caption" style={styles.subtitle}>
            Quick wellness check (30 seconds)
          </ThemedText>
        </View>

        {/* Sleep Section */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="moon" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Sleep
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.cardLabel}>
            How did you sleep?
          </ThemedText>
          <ScaleInput
            value={formData.sleepQuality}
            onChange={setSleepQuality}
            lowLabel="Terrible"
            highLabel="Amazing"
            accessibilityLabel="Sleep quality rating"
          />

          <ThemedText type="caption" style={[styles.cardLabel, styles.marginTop]}>
            Hours slept
          </ThemedText>
          <HoursInput
            value={formData.sleepHours}
            onChange={setSleepHours}
            min={0}
            max={14}
            step={0.5}
            accessibilityLabel="Hours of sleep"
          />
        </ThemedView>

        {/* Energy Level */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Energy Level
            </ThemedText>
          </View>
          <ScaleInput
            value={formData.energyLevel}
            onChange={setEnergyLevel}
            lowLabel="Exhausted"
            highLabel="Energized"
            accessibilityLabel="Energy level rating"
          />
        </ThemedView>

        {/* Stress Level */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="pulse" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Stress Level
            </ThemedText>
          </View>
          <ScaleInput
            value={formData.stressLevel}
            onChange={setStressLevel}
            lowLabel="Calm"
            highLabel="Stressed"
            accessibilityLabel="Stress level rating"
          />
        </ThemedView>

        {/* Muscle Soreness */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="body" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Muscle Soreness
            </ThemedText>
          </View>
          <SorenessInput
            overallSoreness={formData.overallSoreness}
            sorenessAreas={formData.sorenessAreas}
            onOverallChange={setOverallSoreness}
            onAreaToggle={toggleSorenessArea}
            accessibilityLabel="Muscle soreness input"
          />
        </ThemedView>

        {/* Available Time */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Available Time
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.cardLabel}>
            How much time do you have for training today?
          </ThemedText>
          <TimeAvailableInput
            value={formData.availableTimeMinutes}
            onChange={setAvailableTime}
            accessibilityLabel="Available training time"
          />
        </ThemedView>

        {/* Constraints */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Any Constraints?
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.cardLabel}>
            Select any that apply (optional)
          </ThemedText>
          <ConstraintToggles
            selected={formData.constraints}
            onChange={setConstraints}
            accessibilityLabel="Training constraints"
          />
        </ThemedView>

        {/* Validation Error */}
        {submissionError && (
          <ThemedView
            style={[styles.errorCard, { backgroundColor: `${Colors[colorScheme].error}15` }]}
          >
            <Ionicons name="alert-circle" size={20} color={Colors[colorScheme].error} />
            <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
              {submissionError}
            </ThemedText>
          </ThemedView>
        )}

        {/* Missing Fields Hint */}
        {!isFormValid && missingFields.length > 0 && !submissionError && (
          <ThemedText type="caption" style={styles.missingHint}>
            Complete: {missingFields.join(', ')}
          </ThemedText>
        )}

        {/* Submit Button */}
        <Button
          title="Get Today's Recommendation"
          onPress={submitCheckin}
          disabled={!isFormValid}
          accessibilityLabel="Submit daily check-in"
          style={styles.submitButton}
        />

        {/* History Link */}
        <Pressable
          style={styles.historyLink}
          onPress={() => router.push('/checkin/history')}
          accessibilityLabel="View check-in history"
          accessibilityRole="link"
        >
          <Ionicons name="time-outline" size={16} color={Colors[colorScheme].primary} />
          <ThemedText type="link" style={styles.historyLinkText}>
            View check-in history
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

type IntensityBadgeProps = {
  intensity: 'recovery' | 'easy' | 'moderate' | 'hard';
  colorScheme: 'light' | 'dark';
};

function IntensityBadge({ intensity, colorScheme }: IntensityBadgeProps) {
  const getColor = () => {
    switch (intensity) {
      case 'recovery':
        return Colors[colorScheme].zoneRecovery;
      case 'easy':
        return Colors[colorScheme].zoneEndurance;
      case 'moderate':
        return Colors[colorScheme].zoneTempo;
      case 'hard':
        return Colors[colorScheme].zoneThreshold;
    }
  };

  const getLabel = () => {
    return intensity.charAt(0).toUpperCase() + intensity.slice(1);
  };

  return (
    <View style={[styles.intensityBadge, { backgroundColor: getColor() }]}>
      <ThemedText style={styles.intensityText}>{getLabel()}</ThemedText>
    </View>
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
  header: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
  },
  cardLabel: {
    marginBottom: 12,
  },
  marginTop: {
    marginTop: 20,
  },
  submitButton: {
    marginTop: 8,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  missingHint: {
    textAlign: 'center',
    marginBottom: 8,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    padding: 8,
  },
  historyLinkText: {
    fontSize: 14,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingTitle: {
    marginTop: 8,
  },
  loadingSubtitle: {
    textAlign: 'center',
  },

  // Success state
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    textAlign: 'center',
  },
  recommendationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  actionButtons: {
    gap: 12,
  },
  resetLink: {
    alignItems: 'center',
    marginTop: 24,
    padding: 8,
  },
});
